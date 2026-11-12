import type { EstadoActividad, Prisma } from '@prisma/client'
import {
  ASPECTO_BITACORA,
  CLAVES_COMPONENTE,
  PLANTILLAS_INSTRUMENTO,
  aspectoDeshabilitado,
  calcularCalificacion,
  calcularPares,
  instrumentosSinFuncion,
  puntajeLikert,
  validarRespuestasLikert,
  type CalificacionDeParticipante,
  type ClavePlantilla,
  type DesgloseCalificacion,
  type EstadoPuntaje,
  type InstrumentoDePonderacion,
  type Ponderacion,
  type ProyectoDeEquipo,
  type RespuestasDistribucion,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorEquipoNoEncontrado,
  ErrorFaseNoPermiteAccion,
  ErrorInstrumentoNoEncontrado,
  ErrorValidacion,
} from '../../errores.js'
import {
  exigirAccion,
  listarParticipantes,
  obtenerConfiguracionDeActividad,
  type MembresiaActor,
} from '../actividades/actividades.service.js'
import { registrarComprobadorDeDatos } from '../actividades/cambiosDeFuncion.js'
import { listarEquipos } from '../equipos/equipos.service.js'
import { registrarEvento } from '../historial/historial.service.js'
import { obtenerPonderacion } from './ponderacion.service.js'

// Calificaciones (nucleo §10.3): se calculan al pedirlas, nunca se guardan.
// Este módulo es el único que lee y escribe `puntajes_capturados`; las
// respuestas a las plantillas las lee para puntuarlas.

const MENSAJE_FASE = 'Los puntajes se capturan durante el desarrollo y el cierre.'

export interface ActividadParaCalificaciones {
  idActividad: string
  estado: EstadoActividad
}

interface EquipoResumido {
  id: string
  nombre: string
  participantes: string[]
}

interface DatosDeCalificacion {
  ponderacion: Ponderacion
  instrumentos: Map<string, InstrumentoDePonderacion & { claveComponente: string }>
  sinFuncion: Set<string>
  participantes: { idMembresia: string; nombre: string }[]
  equipoDe: Map<string, EquipoResumido>
  equipos: EquipoResumido[]
  /** Por instrumento y autor: las filas de respuesta, por clave de reactivo. */
  respuestas: Map<string, Map<string, Record<string, unknown>>>
  /** Por instrumento y persona: el puntaje capturado. */
  puntajes: Map<string, Map<string, number>>
}

// Sin la función habilitada no hay calificación que mostrar ni capturar.
async function exigirCalificacionHabilitada(idActividad: string): Promise<Record<string, string>> {
  const configuracion = await obtenerConfiguracionDeActividad(idActividad)
  if (configuracion.calificacion !== 'habilitada') {
    throw new ErrorFaseNoPermiteAccion('La calificación está deshabilitada en esta actividad.')
  }
  return configuracion
}

async function cargarDatos(idActividad: string): Promise<DatosDeCalificacion> {
  const configuracion = await exigirCalificacionHabilitada(idActividad)
  const [ponderacion, participantes, lista] = await Promise.all([
    obtenerPonderacion(idActividad),
    listarParticipantes(idActividad),
    listarEquipos(idActividad, ''),
  ])

  const instrumentos = new Map<string, InstrumentoDePonderacion & { claveComponente: string }>()
  for (const componente of ponderacion.componentes) {
    for (const aspecto of componente.aspectos) {
      for (const instrumento of aspecto.instrumentos) {
        instrumentos.set(instrumento.id, { ...instrumento, claveComponente: componente.clave })
      }
    }
  }

  const equipos = lista.equipos.map((equipo) => ({
    id: equipo.id,
    nombre: equipo.nombre,
    participantes: equipo.integrantes
      .filter((i) => i.rol === 'participante')
      .map((i) => i.idMembresia),
  }))
  const equipoDe = new Map<string, EquipoResumido>()
  for (const equipo of equipos) {
    for (const id of equipo.participantes) equipoDe.set(id, equipo)
  }

  const ids = [...instrumentos.keys()]
  const [filasRespuesta, filasPuntaje] = await Promise.all([
    prisma.respuestaInstrumento.findMany({ where: { idInstrumento: { in: ids } } }),
    prisma.puntajeCapturado.findMany({ where: { idInstrumento: { in: ids } } }),
  ])
  const respuestas = new Map<string, Map<string, Record<string, unknown>>>()
  for (const fila of filasRespuesta) {
    const porAutor = respuestas.get(fila.idInstrumento) ?? new Map()
    const propias = porAutor.get(fila.idMembresiaAutor) ?? {}
    propias[fila.claveReactivo] = fila.valor
    porAutor.set(fila.idMembresiaAutor, propias)
    respuestas.set(fila.idInstrumento, porAutor)
  }
  const puntajes = new Map<string, Map<string, number>>()
  for (const fila of filasPuntaje) {
    const porPersona = puntajes.get(fila.idInstrumento) ?? new Map()
    porPersona.set(fila.idMembresia, Number(fila.valor))
    puntajes.set(fila.idInstrumento, porPersona)
  }

  return {
    ponderacion,
    instrumentos,
    sinFuncion: instrumentosSinFuncion(ponderacion, configuracion),
    participantes,
    equipoDe,
    equipos,
    respuestas,
    puntajes,
  }
}

// El puntaje de cada instrumento para una persona (nucleo §10.3): una
// plantilla se puntúa sola con sus respuestas; lo demás, con lo capturado.
function puntajesDe(datos: DatosDeCalificacion, idMembresia: string) {
  return (idInstrumento: string): EstadoPuntaje => {
    const instrumento = datos.instrumentos.get(idInstrumento)
    if (!instrumento || datos.sinFuncion.has(idInstrumento)) return { estado: 'no_aplica' }

    if (instrumento.origen === 'plantilla' && instrumento.clavePlantilla) {
      const plantilla = PLANTILLAS_INSTRUMENTO[instrumento.clavePlantilla as ClavePlantilla]
      const porAutor = datos.respuestas.get(idInstrumento) ?? new Map()
      if (plantilla.campo === 'likert') {
        const validas = validarRespuestasLikert(plantilla, porAutor.get(idMembresia) ?? {})
        return 'errores' in validas
          ? { estado: 'pendiente' }
          : { estado: 'valor', valor: puntajeLikert(plantilla, validas.respuestas) }
      }
      // Pares: con los votos vigentes del equipo actual (nucleo §10.2).
      const equipo = datos.equipoDe.get(idMembresia)?.participantes ?? [idMembresia]
      const delEquipo: Record<string, RespuestasDistribucion> = {}
      for (const autor of equipo) {
        const r = porAutor.get(autor)
        if (r) delEquipo[autor] = r as RespuestasDistribucion
      }
      const { puntaje } = calcularPares(plantilla, idMembresia, equipo, delEquipo)
      return puntaje === null ? { estado: 'no_aplica' } : { estado: 'valor', valor: puntaje }
    }

    const capturado = datos.puntajes.get(idInstrumento)?.get(idMembresia)
    return capturado === undefined ? { estado: 'pendiente' } : { estado: 'valor', valor: capturado }
  }
}

function desgloseDe(
  datos: DatosDeCalificacion,
  participante: { idMembresia: string; nombre: string },
): DesgloseCalificacion {
  const puntajeDe = puntajesDe(datos, participante.idMembresia)
  const calculo = calcularCalificacion(datos.ponderacion, puntajeDe)
  // Lo calificado hasta ahora: lo pendiente todavía no cuenta, ni a favor
  // ni en contra.
  const sinPendientes = calcularCalificacion(datos.ponderacion, (id) => {
    const p = puntajeDe(id)
    return p.estado === 'pendiente' ? { estado: 'no_aplica' } : p
  })
  const cubre = calculo.componentes
    .flatMap((c) => c.aspectos)
    .flatMap((a) => a.instrumentos)
    .filter((i) => i.puntaje.estado === 'valor')
    .reduce((total, i) => total + i.pesoEfectivo, 0)
  const equipo = datos.equipoDe.get(participante.idMembresia)
  return {
    idMembresia: participante.idMembresia,
    nombre: participante.nombre,
    equipo: equipo ? { id: equipo.id, nombre: equipo.nombre } : null,
    valor: calculo.valor,
    provisional: calculo.provisional,
    parcial: { valor: sinPendientes.valor, cubre },
    componentes: datos.ponderacion.componentes.map((componente, i) => {
      const c = calculo.componentes[i]
      return {
        id: componente.id,
        clave: componente.clave,
        nombre: componente.nombre,
        pesoEfectivo: c.pesoEfectivo,
        valor: c.valor,
        aspectos: componente.aspectos.map((aspecto, j) => {
          const a = c.aspectos[j]
          return {
            id: aspecto.id,
            clave: aspecto.clave,
            nombre: aspecto.nombre,
            pesoEfectivo: a.pesoEfectivo,
            valor: a.valor,
            instrumentos: aspecto.instrumentos.map((instrumento, k) => ({
              id: instrumento.id,
              nombre: instrumento.nombre,
              origen: instrumento.origen,
              clavePlantilla: instrumento.clavePlantilla,
              fechaPlanificada: instrumento.fechaPlanificada,
              puntaje: a.instrumentos[k].puntaje,
              pesoEfectivo: a.instrumentos[k].pesoEfectivo,
              capturable: instrumento.origen !== 'plantilla',
            })),
          }
        }),
      }
    }),
  }
}

function exigirOrganizador(membresia: MembresiaActor): void {
  if (membresia.rol === 'participante') throw new ErrorAccionNoPermitida()
}

// GET /api/actividades/{id}/calificaciones: para quien organiza, la
// calificación de cada participante con lo que le falta.
export async function listarCalificaciones(
  actividad: ActividadParaCalificaciones,
  membresia: MembresiaActor,
): Promise<CalificacionDeParticipante[]> {
  exigirOrganizador(membresia)
  const datos = await cargarDatos(actividad.idActividad)
  return datos.participantes.map((participante) => {
    const desglose = desgloseDe(datos, participante)
    // Lo pendiente que pesa, separado por quién lo debe: quien organiza lo
    // captura; lo que se puntúa solo espera las respuestas del participante.
    const pendientes = desglose.componentes
      .flatMap((c) => c.aspectos)
      .flatMap((a) => a.instrumentos.map((i) => ({ aspecto: a.nombre, ...i })))
      .filter((i) => i.puntaje.estado === 'pendiente' && i.pesoEfectivo > 0)
    return {
      idMembresia: desglose.idMembresia,
      nombre: desglose.nombre,
      equipo: desglose.equipo,
      valor: desglose.valor,
      provisional: desglose.provisional,
      porCalificar: pendientes
        .filter((i) => i.capturable)
        .map((i) => (i.nombre === i.aspecto ? i.nombre : `${i.nombre} (${i.aspecto})`)),
      porResponder: pendientes.filter((i) => !i.capturable).length,
    }
  })
}

// GET /api/actividades/{id}/calificaciones/{idMembresia}: quien organiza ve
// la de cualquiera, y captura puntajes desde el desarrollo; quien participa
// ve la suya solo desde el cierre, cuando ya está disponible.
export async function obtenerDesglose(
  actividad: ActividadParaCalificaciones,
  membresia: MembresiaActor,
  idMembresia: string,
): Promise<DesgloseCalificacion> {
  if (membresia.rol === 'participante') {
    if (idMembresia !== membresia.idMembresia) throw new ErrorAccionNoPermitida()
    if (!['cierre', 'archivada'].includes(actividad.estado)) {
      throw new ErrorFaseNoPermiteAccion('Tu calificación se verá en el cierre.')
    }
  }
  const datos = await cargarDatos(actividad.idActividad)
  const participante = datos.participantes.find((p) => p.idMembresia === idMembresia)
  if (!participante) throw new ErrorValidacion({ idMembresia: 'No participa en esta actividad.' })
  return desgloseDe(datos, participante)
}

// GET /api/actividades/{id}/calificaciones/proyecto: para la captura por
// equipo, cada equipo con el puntaje de cada elemento que cuenta.
export async function proyectoPorEquipo(
  actividad: ActividadParaCalificaciones,
  membresia: MembresiaActor,
): Promise<ProyectoDeEquipo[]> {
  exigirOrganizador(membresia)
  const configuracion = await obtenerConfiguracionDeActividad(actividad.idActividad)
  const datos = await cargarDatos(actividad.idActividad)
  const proyecto = datos.ponderacion.componentes.find((c) => c.clave === CLAVES_COMPONENTE.proyecto)
  // La bitácora es individual: se puntúa por persona en su desglose.
  const elementos = (proyecto?.aspectos ?? [])
    .filter((a) => a.clave !== ASPECTO_BITACORA)
    .filter((a) => !aspectoDeshabilitado(CLAVES_COMPONENTE.proyecto, a.clave, configuracion))
    .flatMap((a) => a.instrumentos.map((i) => ({ aspecto: a, instrumento: i })))
  return datos.equipos.map((equipo) => ({
    idEquipo: equipo.id,
    nombre: equipo.nombre,
    integrantes: equipo.participantes.length,
    elementos: elementos.map(({ aspecto, instrumento }) => {
      const porPersona = datos.puntajes.get(instrumento.id)
      const valores = equipo.participantes.map((id) => porPersona?.get(id))
      const distintos = new Set(valores.map((v) => (v === undefined ? 'sin' : String(v))))
      return {
        idInstrumento: instrumento.id,
        clave: aspecto.clave,
        nombre: aspecto.nombre,
        valor: distintos.size === 1 && valores[0] !== undefined ? valores[0] : null,
        ajustado: distintos.size > 1 && valores.some((v) => v !== undefined),
      }
    }),
  }))
}

async function instrumentoCapturable(idActividad: string, idInstrumento: string) {
  const instrumento = await prisma.instrumento.findFirst({
    where: { idInstrumento, aspecto: { componente: { idActividad } } },
    include: { aspecto: { include: { componente: true } } },
  })
  if (!instrumento) throw new ErrorInstrumentoNoEncontrado()
  if (instrumento.origen === 'plantilla') {
    throw new ErrorValidacion({
      instrumento: 'Este instrumento se puntúa solo con sus respuestas.',
    })
  }
  return instrumento
}

type Cliente = Prisma.TransactionClient

// Escribe o retira el puntaje de una persona; devuelve el anterior.
async function escribirPuntaje(
  tx: Cliente,
  idInstrumento: string,
  idMembresia: string,
  valor: number | null,
  idCalificador: string,
): Promise<number | null> {
  const clave = { idInstrumento_idMembresia: { idInstrumento, idMembresia } }
  const anterior = await tx.puntajeCapturado.findUnique({ where: clave })
  if (valor === null) {
    if (anterior) await tx.puntajeCapturado.delete({ where: clave })
  } else {
    await tx.puntajeCapturado.upsert({
      where: clave,
      create: { idInstrumento, idMembresia, valor, idMembresiaCalificador: idCalificador },
      update: { valor, idMembresiaCalificador: idCalificador, fechaAsignacion: new Date() },
    })
  }
  return anterior ? Number(anterior.valor) : null
}

// PUT /api/actividades/{id}/instrumentos/{idInstrumento}/puntajes/{idMembresia}:
// captura, corrige o retira (valor nulo) el puntaje de un participante. El
// evento conserva el anterior (nucleo §10.3, "Modificación posterior").
export async function capturarPuntaje(
  actividad: ActividadParaCalificaciones,
  membresia: MembresiaActor,
  idInstrumento: string,
  idMembresia: string,
  valor: number | null,
  idUsuarioActor: string,
): Promise<void> {
  exigirAccion(membresia, 'capturar_puntaje', actividad.estado, MENSAJE_FASE)
  await exigirCalificacionHabilitada(actividad.idActividad)
  const instrumento = await instrumentoCapturable(actividad.idActividad, idInstrumento)
  const participantes = await listarParticipantes(actividad.idActividad)
  const participante = participantes.find((p) => p.idMembresia === idMembresia)
  if (!participante) throw new ErrorValidacion({ idMembresia: 'No participa en esta actividad.' })
  const { equipos } = await listarEquipos(actividad.idActividad, '')
  const idEquipo = equipos.find((e) => e.integrantes.some((i) => i.idMembresia === idMembresia))?.id

  await prisma.$transaction(async (tx) => {
    const antes = await escribirPuntaje(
      tx,
      idInstrumento,
      idMembresia,
      valor,
      membresia.idMembresia,
    )
    if (antes === valor) return
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'puntaje_capturado',
      tipoEntidad: 'instrumento',
      idEntidad: idInstrumento,
      datos: {
        nombre: instrumento.nombre,
        aspecto: instrumento.aspecto.nombre,
        participante: participante.nombre,
        idMembresia,
        antes,
        despues: valor,
        ...(idEquipo ? { idEquipo } : {}),
      },
      categoria: 'evaluacion',
    })
  })
}

// PUT .../instrumentos/{idInstrumento}/puntajes/equipos/{idEquipo}: el
// puntaje de un elemento del proyecto para todo el equipo (P-40). Sobrescribe
// también los ajustes individuales; la pantalla lo advierte antes.
export async function capturarPuntajeDeEquipo(
  actividad: ActividadParaCalificaciones,
  membresia: MembresiaActor,
  idInstrumento: string,
  idEquipo: string,
  valor: number | null,
  idUsuarioActor: string,
): Promise<void> {
  exigirAccion(membresia, 'capturar_puntaje', actividad.estado, MENSAJE_FASE)
  await exigirCalificacionHabilitada(actividad.idActividad)
  const instrumento = await instrumentoCapturable(actividad.idActividad, idInstrumento)
  if (instrumento.aspecto.componente.clave !== CLAVES_COMPONENTE.proyecto) {
    throw new ErrorValidacion({ instrumento: 'Solo el proyecto se captura por equipo.' })
  }
  if (instrumento.aspecto.clave === ASPECTO_BITACORA) {
    throw new ErrorValidacion({ instrumento: 'La bitácora se puntúa por persona.' })
  }
  const { equipos } = await listarEquipos(actividad.idActividad, '')
  const equipo = equipos.find((e) => e.id === idEquipo)
  if (!equipo) throw new ErrorEquipoNoEncontrado()
  const participantes = equipo.integrantes.filter((i) => i.rol === 'participante')

  await prisma.$transaction(async (tx) => {
    for (const p of participantes) {
      await escribirPuntaje(tx, idInstrumento, p.idMembresia, valor, membresia.idMembresia)
    }
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'puntaje_capturado_equipo',
      tipoEntidad: 'instrumento',
      idEntidad: idInstrumento,
      datos: {
        nombre: instrumento.aspecto.nombre,
        equipo: equipo.nombre,
        idEquipo,
        despues: valor,
      },
      categoria: 'evaluacion',
    })
  })
}

// Comprobador de P-17 (general §6.2) para `calificacion`: con puntajes
// capturados, deshabilitarla ya habilitada se rechaza.
registrarComprobadorDeDatos('calificacion', async (tx, idActividad) => {
  const alguno = await tx.puntajeCapturado.findFirst({
    where: { instrumento: { aspecto: { componente: { idActividad } } } },
    select: { idPuntaje: true },
  })
  return alguno
    ? 'La calificación ya tiene puntajes capturados: solo puede habilitarse, no deshabilitarse.'
    : null
})
