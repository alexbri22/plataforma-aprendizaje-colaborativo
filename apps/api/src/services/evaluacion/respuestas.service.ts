import type { EstadoActividad, Prisma, RespuestaInstrumento } from '@prisma/client'
import {
  CLAVES_COMPONENTE,
  MINIMO_RESPUESTAS_PARES_VISIBLES,
  PLANTILLAS_INSTRUMENTO,
  calcularPares,
  repartoVigente,
  validarRespuestasDistribucion,
  validarRespuestasLikert,
  type ClavePlantilla,
  type AvanceDeInstrumento,
  type CumplimientoDeInstrumento,
  type InstrumentoPorResponder,
  type MisResultadosPares,
  type PlantillaInstrumento,
  type RespuestasDeInstrumento,
  type RespuestasDistribucion,
  type ResultadosParesDeEquipo,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorInstrumentoNoEncontrado,
  ErrorValidacion,
} from '../../errores.js'
import { aFechaCalendario } from '../../utilidades/fechas.js'
import { exigirAccion, type MembresiaActor } from '../actividades/actividades.service.js'
import {
  listarIntegrantesDeEquipo,
  obtenerIdEquipoDeMembresia,
  participantesConEquipo,
} from '../equipos/equipos.service.js'
import { registrarEvento } from '../historial/historial.service.js'

// Respuestas a las plantillas del proceso colaborativo (nucleo §10.1 y
// §10.2): las autoevaluaciones de escala y la evaluación por pares. Este
// módulo es el único que lee y escribe `respuestas_instrumento`.

const MENSAJE_FASE = 'Los instrumentos se responden durante el desarrollo y el cierre.'

export interface ActividadParaRespuestas {
  idActividad: string
  estado: EstadoActividad
}

function esPlantilla(clave: string | null): clave is ClavePlantilla {
  return clave !== null && clave in PLANTILLAS_INSTRUMENTO
}

const esPares = (clave: string | null) => clave === 'evaluacion_pares'

// Los participantes activos del equipo, que son a quienes se reparte en la
// evaluación por pares (nucleo §10.2). Quien organiza e integra el equipo no
// responde ni recibe calificación (nucleo §10.3).
async function participantesDeEquipo(idEquipo: string, idActividad: string): Promise<string[]> {
  const integrantes = await listarIntegrantesDeEquipo(idEquipo, idActividad)
  return integrantes.filter((i) => i.rol === 'participante').map((i) => i.idMembresia)
}

// Solo quien participa responde y recibe calificación (nucleo §10.3).
function exigirParticipante(membresia: MembresiaActor): void {
  if (membresia.rol !== 'participante') throw new ErrorAccionNoPermitida()
}

// GET /api/actividades/{id}/mis-instrumentos: lo que le toca a quien
// participa en el proceso colaborativo, las autoevaluaciones con plantilla
// y las actividades externas, con cuándo completó cada una (respondió la
// plantilla o registró su entrega).
export async function listarMisInstrumentos(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
): Promise<InstrumentoPorResponder[]> {
  exigirParticipante(membresia)
  const idEquipo = await obtenerIdEquipoDeMembresia(membresia.idMembresia)
  const equipo = idEquipo ? await participantesDeEquipo(idEquipo, actividad.idActividad) : []

  const instrumentos = await prisma.instrumento.findMany({
    where: {
      origen: { in: ['plantilla', 'enlace'] },
      aspecto: {
        componente: { idActividad: actividad.idActividad, clave: CLAVES_COMPONENTE.proceso },
      },
    },
    include: {
      aspecto: true,
      respuestas: {
        where: { idMembresiaAutor: membresia.idMembresia },
        select: { claveReactivo: true, valor: true, fecha: true },
        orderBy: { fecha: 'desc' },
      },
      entregas: {
        where: { idMembresia: membresia.idMembresia },
        select: { fechaActualizacion: true },
      },
    },
    orderBy: [{ fechaPlanificada: 'asc' }, { aspecto: { orden: 'asc' } }, { orden: 'asc' }],
  })

  return (
    instrumentos
      // La evaluación por pares no aplica sin compañeros a quienes evaluar.
      .filter(
        (i) =>
          i.origen === 'enlace' ||
          (esPlantilla(i.clavePlantilla) && (!esPares(i.clavePlantilla) || equipo.length >= 2)),
      )
      .map((i) => ({
        id: i.idInstrumento,
        nombre: i.nombre,
        aspecto: { clave: i.aspecto.clave, nombre: i.aspecto.nombre },
        formato: i.origen as 'plantilla' | 'enlace',
        clavePlantilla: i.clavePlantilla as ClavePlantilla | null,
        enlace: i.enlace,
        fechaPlanificada: i.fechaPlanificada ? aFechaCalendario(i.fechaPlanificada) : null,
        completadoEn:
          (i.origen === 'enlace'
            ? i.entregas[0]?.fechaActualizacion
            : // Una evaluación por pares hecha para otro equipo (hubo una
              // reasignación) vuelve a quedar pendiente.
              esPares(i.clavePlantilla) &&
                !repartoVigente(
                  Object.fromEntries(
                    i.respuestas.map((r) => [r.claveReactivo, r.valor as Record<string, number>]),
                  ),
                  equipo,
                )
              ? undefined
              : i.respuestas[0]?.fecha
          )?.toISOString() ?? null,
      }))
  )
}

async function plantillaDeActividad(actividad: ActividadParaRespuestas, id: string) {
  const instrumento = await prisma.instrumento.findFirst({
    where: {
      idInstrumento: id,
      aspecto: { componente: { idActividad: actividad.idActividad } },
    },
  })
  if (!instrumento) throw new ErrorInstrumentoNoEncontrado()
  if (instrumento.origen !== 'plantilla' || !esPlantilla(instrumento.clavePlantilla)) {
    throw new ErrorValidacion({ instrumento: 'Este instrumento no se responde en la plataforma.' })
  }
  return { instrumento, plantilla: PLANTILLAS_INSTRUMENTO[instrumento.clavePlantilla] }
}

// Agrupa las filas por persona: una respuesta completa por autor.
function agruparPorAutor(idInstrumento: string, filas: RespuestaInstrumento[]) {
  const porAutor = new Map<string, RespuestasDeInstrumento>()
  for (const fila of filas) {
    const actual = porAutor.get(fila.idMembresiaAutor) ?? {
      idInstrumento,
      idMembresia: fila.idMembresiaAutor,
      respuestas: {},
      fecha: fila.fecha.toISOString(),
    }
    // Un entero de la escala, o el reparto por integrante en pares.
    ;(actual.respuestas as Record<string, unknown>)[fila.claveReactivo] = fila.valor
    if (fila.fecha.toISOString() > actual.fecha) actual.fecha = fila.fecha.toISOString()
    porAutor.set(fila.idMembresiaAutor, actual)
  }
  return [...porAutor.values()]
}

// GET /api/actividades/{id}/instrumentos/{idInstrumento}/respuestas: quien
// participa ve las suyas; quien organiza o co-organiza, las de todos.
export async function listarRespuestas(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
): Promise<RespuestasDeInstrumento[]> {
  await plantillaDeActividad(actividad, idInstrumento)
  const filas = await prisma.respuestaInstrumento.findMany({
    where: {
      idInstrumento,
      ...(membresia.rol === 'participante' ? { idMembresiaAutor: membresia.idMembresia } : {}),
    },
  })
  return agruparPorAutor(idInstrumento, filas)
}

// La forma de las respuestas depende del campo de la plantilla. En pares se
// valida contra el equipo de quien responde en este momento (nucleo §10.2).
async function validarSegunPlantilla(
  plantilla: PlantillaInstrumento,
  valor: unknown,
  membresia: MembresiaActor,
  idEquipo: string | null,
  idActividad: string,
): Promise<Record<string, unknown>> {
  if (plantilla.campo === 'likert') {
    const resultado = validarRespuestasLikert(plantilla, valor)
    if ('errores' in resultado) throw new ErrorValidacion(resultado.errores)
    return resultado.respuestas
  }
  const equipo = idEquipo ? await participantesDeEquipo(idEquipo, idActividad) : []
  if (!equipo.includes(membresia.idMembresia) || equipo.length < 2) {
    throw new ErrorValidacion({
      instrumento: 'La evaluación por pares necesita un equipo con al menos dos participantes.',
    })
  }
  const resultado = validarRespuestasDistribucion(plantilla, valor, equipo)
  if ('errores' in resultado) throw new ErrorValidacion(resultado.errores)
  return resultado.respuestas
}

// Dos respuestas iguales, reactivo por reactivo. Por clave y no serializadas:
// jsonb reordena las claves de un objeto al guardarlo.
function mismoValor(a: unknown, b: unknown): boolean {
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return a === b
  const x = a as Record<string, unknown>
  const y = b as Record<string, unknown>
  const claves = Object.keys(x)
  return claves.length === Object.keys(y).length && claves.every((k) => x[k] === y[k])
}

// PUT /api/actividades/{id}/instrumentos/{idInstrumento}/respuestas: responde
// o vuelve a responder una plantilla completa (nucleo §10.1, "Responder de
// nuevo"). Se guarda la última; el historial conserva la anterior.
export async function responderInstrumento(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
  valor: unknown,
  idUsuarioActor: string,
): Promise<RespuestasDeInstrumento> {
  exigirAccion(membresia, 'responder_instrumento', actividad.estado, MENSAJE_FASE)
  const { instrumento, plantilla } = await plantillaDeActividad(actividad, idInstrumento)
  const idEquipo = await obtenerIdEquipoDeMembresia(membresia.idMembresia)
  const respuestas = await validarSegunPlantilla(
    plantilla,
    valor,
    membresia,
    idEquipo,
    actividad.idActividad,
  )
  const donde = { idInstrumento, idMembresiaAutor: membresia.idMembresia }

  await prisma.$transaction(async (tx) => {
    const anteriores = await tx.respuestaInstrumento.findMany({ where: donde })
    const antes: Record<string, unknown> = Object.fromEntries(
      anteriores.map((fila) => [fila.claveReactivo, fila.valor]),
    )
    const iguales =
      anteriores.length > 0 &&
      plantilla.reactivos.every((r) => mismoValor(antes[r.clave], respuestas[r.clave]))
    if (iguales) return

    await tx.respuestaInstrumento.deleteMany({ where: donde })
    await tx.respuestaInstrumento.createMany({
      data: Object.entries(respuestas).map(([claveReactivo, v]) => ({
        ...donde,
        claveReactivo,
        valor: v as number | Record<string, number>,
      })),
    })

    // Aportación (nucleo §5.2), privada como la bitácora: en el historial
    // del equipo solo la ven su autor y quien organiza (historial.service).
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: anteriores.length === 0 ? 'instrumento_respondido' : 'respuesta_modificada',
      tipoEntidad: 'instrumento',
      idEntidad: idInstrumento,
      datos: {
        nombre: instrumento.nombre,
        idMembresia: membresia.idMembresia,
        ...(idEquipo ? { idEquipo } : {}),
        ...(anteriores.length === 0
          ? {}
          : {
              antes: antes as Prisma.InputJsonObject,
              despues: respuestas as Prisma.InputJsonObject,
            }),
      },
      categoria: 'aportacion',
    })
  })

  const [propia] = await listarRespuestas(actividad, membresia, idInstrumento)
  return propia
}

// GET /api/actividades/{id}/aspectos/{idAspecto}/cumplimiento: para quien
// organiza, cada instancia del aspecto con quiénes ya la completaron. La
// pantalla del equipo cruza la lista con sus integrantes.
export async function cumplimientoDeAspecto(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idAspecto: string,
): Promise<CumplimientoDeInstrumento[]> {
  if (membresia.rol === 'participante') throw new ErrorAccionNoPermitida()
  const instrumentos = await prisma.instrumento.findMany({
    where: {
      idAspecto,
      origen: { in: ['plantilla', 'enlace'] },
      aspecto: { componente: { idActividad: actividad.idActividad } },
    },
    include: {
      respuestas: { select: { idMembresiaAutor: true, fecha: true } },
      entregas: { select: { idMembresia: true, fechaActualizacion: true } },
      puntajes: { select: { idMembresia: true, valor: true } },
    },
    orderBy: { orden: 'asc' },
  })
  return instrumentos.map((i) => {
    const porPersona = new Map<string, string>()
    for (const r of i.respuestas) {
      const fecha = r.fecha.toISOString()
      if ((porPersona.get(r.idMembresiaAutor) ?? '') < fecha)
        porPersona.set(r.idMembresiaAutor, fecha)
    }
    for (const e of i.entregas) porPersona.set(e.idMembresia, e.fechaActualizacion.toISOString())
    return {
      id: i.idInstrumento,
      nombre: i.nombre,
      formato: i.origen as 'plantilla' | 'enlace',
      clavePlantilla: i.clavePlantilla as ClavePlantilla | null,
      fechaPlanificada: i.fechaPlanificada ? aFechaCalendario(i.fechaPlanificada) : null,
      completados: [...porPersona].map(([idMembresia, fecha]) => ({ idMembresia, fecha })),
      puntajes: i.puntajes.map((p) => ({ idMembresia: p.idMembresia, valor: Number(p.valor) })),
    }
  })
}

// GET /api/actividades/{id}/cumplimiento-instrumentos (Operación de la
// planeación): para quien organiza, cada instancia del proceso colaborativo
// con cuántos de los participantes con equipo ya la completaron. El detalle
// por persona sigue en el cumplimiento de cada aspecto.
export async function avanceDeInstrumentos(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
): Promise<AvanceDeInstrumento[]> {
  if (membresia.rol === 'participante') throw new ErrorAccionNoPermitida()
  const [instrumentos, participantes] = await Promise.all([
    prisma.instrumento.findMany({
      where: {
        origen: { in: ['plantilla', 'enlace'] },
        aspecto: {
          componente: { idActividad: actividad.idActividad, clave: CLAVES_COMPONENTE.proceso },
        },
      },
      include: {
        aspecto: true,
        respuestas: { select: { idMembresiaAutor: true }, distinct: ['idMembresiaAutor'] },
        entregas: { select: { idMembresia: true } },
      },
      orderBy: [{ fechaPlanificada: 'asc' }, { aspecto: { orden: 'asc' } }, { orden: 'asc' }],
    }),
    participantesConEquipo(actividad.idActividad),
  ])
  const conEquipo = new Set(participantes)
  return instrumentos.map((i) => {
    const autores =
      i.origen === 'enlace'
        ? i.entregas.map((e) => e.idMembresia)
        : i.respuestas.map((r) => r.idMembresiaAutor)
    return {
      id: i.idInstrumento,
      nombre: i.nombre,
      aspecto: { clave: i.aspecto.clave, nombre: i.aspecto.nombre },
      fechaPlanificada: i.fechaPlanificada ? aFechaCalendario(i.fechaPlanificada) : null,
      completados: new Set(autores.filter((id) => conEquipo.has(id))).size,
      total: conEquipo.size,
    }
  })
}

// GET /api/actividades/{id}/instrumentos/{idInstrumento}/pares?idEquipo=:
// para quien organiza, el resultado de pares de cada participante del
// equipo, con su autoasignación como contraste (nucleo §10.2). Solo cuentan
// las respuestas vigentes para el equipo actual.
export async function resultadosPares(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
  idEquipo: string,
): Promise<ResultadosParesDeEquipo> {
  if (membresia.rol === 'participante') throw new ErrorAccionNoPermitida()
  const { plantilla, equipo, porAutor } = await respuestasParesDeEquipo(
    actividad,
    idInstrumento,
    idEquipo,
  )
  return {
    idInstrumento,
    integrantes: equipo.map((idMembresia) => ({
      idMembresia,
      respondio: Boolean(porAutor[idMembresia] && repartoVigente(porAutor[idMembresia], equipo)),
      ...calcularPares(plantilla, idMembresia, equipo, porAutor),
    })),
  }
}

async function respuestasParesDeEquipo(
  actividad: ActividadParaRespuestas,
  idInstrumento: string,
  idEquipo: string,
) {
  const { instrumento, plantilla } = await plantillaDeActividad(actividad, idInstrumento)
  if (!esPares(instrumento.clavePlantilla)) {
    throw new ErrorValidacion({ instrumento: 'Este instrumento no es una evaluación por pares.' })
  }
  const equipo = await participantesDeEquipo(idEquipo, actividad.idActividad)
  const filas = await prisma.respuestaInstrumento.findMany({
    where: { idInstrumento, idMembresiaAutor: { in: equipo } },
  })
  const porAutor: Record<string, RespuestasDistribucion> = {}
  for (const fila of filas) {
    porAutor[fila.idMembresiaAutor] ??= {}
    porAutor[fila.idMembresiaAutor][fila.claveReactivo] = fila.valor as Record<string, number>
  }
  return { plantilla, equipo, porAutor }
}

// GET .../instrumentos/{idInstrumento}/pares/mios: para quien participa, lo
// que le dieron sus compañeros en conjunto (P-08). Sin quién dio qué, sin su
// autoasignación y sin el puntaje, que llega con Mis resultados (P-18).
export async function misResultadosPares(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
): Promise<MisResultadosPares> {
  exigirParticipante(membresia)
  const idEquipo = await obtenerIdEquipoDeMembresia(membresia.idMembresia)
  if (!idEquipo) throw new ErrorAccionNoPermitida()
  const { plantilla, equipo, porAutor } = await respuestasParesDeEquipo(
    actividad,
    idInstrumento,
    idEquipo,
  )
  const respondieron = Object.entries(porAutor).filter(
    ([autor, r]) => autor !== membresia.idMembresia && repartoVigente(r, equipo),
  ).length
  const { porAccion } = calcularPares(plantilla, membresia.idMembresia, equipo, porAutor)
  return {
    idInstrumento,
    parteIgual: Math.round((100 / Math.max(1, equipo.length)) * 100) / 100,
    respondieron,
    porAccion:
      respondieron >= MINIMO_RESPUESTAS_PARES_VISIBLES
        ? porAccion.map((a) => ({ clave: a.clave, recibido: a.recibido ?? 0 }))
        : null,
  }
}

// Para ponderacion.service: si alguna instancia ya tiene respuestas o
// entregas, no se reemplaza ni cambia de formato (nucleo §10.1).
export async function hayRespuestas(idsInstrumento: string[]): Promise<boolean> {
  if (idsInstrumento.length === 0) return false
  const donde = { idInstrumento: { in: idsInstrumento } }
  const [respuesta, entrega] = await Promise.all([
    prisma.respuestaInstrumento.findFirst({ where: donde, select: { idRespuesta: true } }),
    prisma.entregaInstrumento.findFirst({ where: donde, select: { idEntrega: true } }),
  ])
  return respuesta !== null || entrega !== null
}
