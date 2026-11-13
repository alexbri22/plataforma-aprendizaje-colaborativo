import type { EstadoActividad, Prisma } from '@prisma/client'
import {
  ASPECTOS_PROCESO,
  CLAVES_COMPONENTE,
  LIMITE_PERIODOS,
  NOMBRE_TIPO,
  estructuraPorDefecto,
  formatosPara,
  generarPeriodos,
  plantillaPara,
  type ClavePlantilla,
  type Ponderacion,
  type TipoInstrumento,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorInstrumentoConRespuestas,
  ErrorInstrumentoNoEncontrado,
  ErrorValidacion,
} from '../../errores.js'
import { aFechaCalendario } from '../../utilidades/fechas.js'
import {
  exigirAccion,
  registrarAlCrearActividad,
  type MembresiaConPermisos,
} from '../actividades/actividades.service.js'
import { registrarEvento } from '../historial/historial.service.js'
import { hayRespuestas } from './respuestas.service.js'
import type { CambiosInstrumento, DefinicionInstrumentos } from './validacion.js'

// Estructura de la calificación (docs/diseno-desarrollo-general.md §4.2;
// nucleo §10.1): componentes, aspectos e instrumentos con sus pesos. Este
// módulo es el único que lee y escribe sus tres tablas. La calificación final
// no se guarda: la calcula calcularCalificacion (packages/shared).

const MENSAJE_FASE = 'La calificación ya no puede configurarse: la actividad está archivada.'

export interface ActividadParaPonderacion {
  idActividad: string
  estado: EstadoActividad
  fechaInicio: Date
  fechaTermino: Date
}

// Toda actividad nace con la estructura por defecto (general §4.2), en la
// misma transacción que la crea.
async function sembrarEstructuraPorDefecto(
  tx: Prisma.TransactionClient,
  idActividad: string,
): Promise<void> {
  for (const [ordenComponente, componente] of estructuraPorDefecto().entries()) {
    await tx.componenteCalificacion.create({
      data: {
        idActividad,
        clave: componente.clave,
        nombre: componente.nombre,
        peso: componente.peso,
        orden: ordenComponente,
        aspectos: {
          create: componente.aspectos.map((aspecto, ordenAspecto) => ({
            clave: aspecto.clave,
            nombre: aspecto.nombre,
            peso: aspecto.peso,
            orden: ordenAspecto,
            instrumentos: {
              create: aspecto.instrumentos.map((instrumento, ordenInstrumento) => ({
                ...instrumento,
                orden: ordenInstrumento,
              })),
            },
          })),
        },
      },
    })
  }
}

registrarAlCrearActividad(sembrarEstructuraPorDefecto)

// GET /api/actividades/{id}/ponderacion: cualquier miembro (nucleo §10.5).
export async function obtenerPonderacion(idActividad: string): Promise<Ponderacion> {
  const componentes = await prisma.componenteCalificacion.findMany({
    where: { idActividad },
    orderBy: { orden: 'asc' },
    include: {
      aspectos: {
        orderBy: { orden: 'asc' },
        include: {
          instrumentos: {
            orderBy: { orden: 'asc' },
            include: { _count: { select: { respuestas: true, entregas: true } } },
          },
        },
      },
    },
  })

  return {
    componentes: componentes.map((componente) => ({
      id: componente.idComponente,
      clave: componente.clave,
      nombre: componente.nombre,
      peso: componente.peso,
      orden: componente.orden,
      aspectos: componente.aspectos.map((aspecto) => ({
        id: aspecto.idAspecto,
        clave: aspecto.clave,
        nombre: aspecto.nombre,
        peso: aspecto.peso,
        orden: aspecto.orden,
        instrumentos: aspecto.instrumentos.map((instrumento) => ({
          id: instrumento.idInstrumento,
          nombre: instrumento.nombre,
          tipo: instrumento.tipo as TipoInstrumento | null,
          origen: instrumento.origen,
          clavePlantilla: instrumento.clavePlantilla as ClavePlantilla | null,
          enlace: instrumento.enlace,
          fechaPlanificada: instrumento.fechaPlanificada
            ? aFechaCalendario(instrumento.fechaPlanificada)
            : null,
          orden: instrumento.orden,
          conRespuestas: instrumento._count.respuestas + instrumento._count.entregas > 0,
        })),
      })),
    })),
  }
}

// PATCH /api/actividades/{id}/componentes/{idComponente} y
// .../aspectos/{idAspecto}: el peso de una parte, guardado al salir del campo
// como el resto de la planificación. No exige que su nivel sume 100: moviendo
// un peso a la vez, la suma se descuadra entre un cambio y el siguiente. La
// pantalla avisa cuando lo que cuenta no suma 100, y el cálculo reparte en
// proporción mientras tanto (general §4.2).
export async function cambiarPeso(
  actividad: ActividadParaPonderacion,
  parte: 'componente' | 'aspecto',
  id: string,
  peso: number,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<Ponderacion> {
  exigirAccion(membresiaActor, 'configurar_calificacion', actividad.estado, MENSAJE_FASE)

  const fila =
    parte === 'componente'
      ? await prisma.componenteCalificacion.findFirst({
          where: { idComponente: id, idActividad: actividad.idActividad },
        })
      : await prisma.aspectoCalificacion.findFirst({
          where: { idAspecto: id, componente: { idActividad: actividad.idActividad } },
        })
  if (!fila) throw new ErrorValidacion({ [parte]: 'No es parte de esta actividad.' })
  if (fila.peso === peso) return obtenerPonderacion(actividad.idActividad)

  await prisma.$transaction(async (tx) => {
    if (parte === 'componente') {
      await tx.componenteCalificacion.update({ where: { idComponente: id }, data: { peso } })
    } else {
      await tx.aspectoCalificacion.update({ where: { idAspecto: id }, data: { peso } })
    }
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'peso_modificado',
      tipoEntidad: parte === 'componente' ? 'componente_calificacion' : 'aspecto_calificacion',
      idEntidad: id,
      datos: { nombre: fila.nombre, antes: fila.peso, despues: peso },
      categoria: 'estructura',
    })
  })

  return obtenerPonderacion(actividad.idActividad)
}

async function aspectoDelProceso(actividad: ActividadParaPonderacion, idAspecto: string) {
  const aspecto = await prisma.aspectoCalificacion.findFirst({
    where: { idAspecto, componente: { idActividad: actividad.idActividad } },
    include: { componente: true, instrumentos: true },
  })
  const catalogo = ASPECTOS_PROCESO.find((a) => a.clave === aspecto?.clave)
  if (!aspecto || aspecto.componente.clave !== CLAVES_COMPONENTE.proceso || !catalogo) {
    throw new ErrorValidacion({ aspecto: 'Este aspecto no admite elegir su instrumento.' })
  }
  return { aspecto, catalogo }
}

// PUT /api/actividades/{id}/aspectos/{idAspecto}/instrumentos: el tipo de
// instrumento de un aspecto del proceso y su periodicidad (nucleo §10.1).
// Reemplaza las instancias que tuviera; cada una nace con el primer formato
// que admite el tipo (la plantilla, si existe), y su formato, enlace y fecha
// se ajustan después una por una. Solo los cinco aspectos del proceso. Si
// alguna instancia ya tiene respuestas, no se reemplaza; los puntajes
// capturados se sumarán a esa regla con su incremento.
export async function definirInstrumentos(
  actividad: ActividadParaPonderacion,
  idAspecto: string,
  definicion: DefinicionInstrumentos,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<Ponderacion> {
  exigirAccion(membresiaActor, 'configurar_calificacion', actividad.estado, MENSAJE_FASE)
  const { aspecto, catalogo } = await aspectoDelProceso(actividad, idAspecto)
  if (await hayRespuestas(aspecto.instrumentos.map((i) => i.idInstrumento))) {
    throw new ErrorInstrumentoConRespuestas(
      'Este aspecto ya tiene respuestas o entregas: sus instrumentos no pueden reemplazarse.',
    )
  }

  let instancias: Prisma.InstrumentoCreateManyInput[] = []
  if (definicion.tipo !== null) {
    const { tipo, periodicidad } = definicion
    if (!(catalogo.tipos as readonly string[]).includes(tipo)) {
      throw new ErrorValidacion({ tipo: 'Este aspecto no admite ese tipo de instrumento.' })
    }

    const periodos =
      periodicidad === 'ninguna'
        ? []
        : generarPeriodos(actividad.fechaInicio, actividad.fechaTermino, periodicidad)
    if (periodos.length > LIMITE_PERIODOS) {
      throw new ErrorValidacion({
        periodicidad: `Esa periodicidad genera más de ${LIMITE_PERIODOS} aplicaciones. Elige una más amplia.`,
      })
    }

    const formato = formatosPara(aspecto.clave, tipo)[0]
    const clavePlantilla = formato === 'plantilla' ? plantillaPara(aspecto.clave, tipo) : null
    const base = { idAspecto, tipo, origen: formato, clavePlantilla, enlace: null }
    instancias =
      periodos.length === 0
        ? [{ ...base, nombre: NOMBRE_TIPO[tipo], fechaPlanificada: null, orden: 0 }]
        : periodos.map((periodo, i) => ({
            ...base,
            nombre: `${NOMBRE_TIPO[tipo]} ${i + 1}`,
            fechaPlanificada: periodo.fechaInicio,
            orden: i,
          }))
  }

  await prisma.$transaction(async (tx) => {
    await tx.instrumento.deleteMany({ where: { idAspecto } })
    await tx.instrumento.createMany({ data: instancias })

    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'instrumentos_definidos',
      tipoEntidad: 'aspecto_calificacion',
      idEntidad: idAspecto,
      datos: {
        aspecto: aspecto.nombre,
        antes: {
          tipo: aspecto.instrumentos[0]?.tipo ?? null,
          instancias: aspecto.instrumentos.length,
        },
        despues: { tipo: definicion.tipo, instancias: instancias.length },
      },
      categoria: 'estructura',
    })
  })

  return obtenerPonderacion(actividad.idActividad)
}

// PATCH /api/actividades/{id}/instrumentos/{idInstrumento}: una instancia del
// calendario de un aspecto del proceso: su formato (entre los que admite su
// tipo en ese aspecto), su enlace si es de formato enlace, y su fecha
// planificada (todavía sin efecto, P-41).
export async function actualizarInstrumento(
  actividad: ActividadParaPonderacion,
  idInstrumento: string,
  cambios: CambiosInstrumento,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<Ponderacion> {
  exigirAccion(membresiaActor, 'configurar_calificacion', actividad.estado, MENSAJE_FASE)

  const instrumento = await prisma.instrumento.findFirst({
    where: { idInstrumento, aspecto: { componente: { idActividad: actividad.idActividad } } },
    include: { aspecto: true },
  })
  if (!instrumento) throw new ErrorInstrumentoNoEncontrado()
  const tipo = instrumento.tipo as TipoInstrumento | null
  if (!tipo) {
    throw new ErrorValidacion({ instrumento: 'Este instrumento no se ajusta por instancia.' })
  }

  const formato = cambios.formato ?? instrumento.origen
  if (formato !== instrumento.origen && (await hayRespuestas([idInstrumento]))) {
    throw new ErrorInstrumentoConRespuestas(
      'Esta instancia ya tiene respuestas o entregas: su formato no puede cambiar.',
    )
  }
  if (!formatosPara(instrumento.aspecto.clave, tipo).includes(formato)) {
    throw new ErrorValidacion({ formato: 'Ese formato no está disponible para este tipo.' })
  }
  const enlace =
    formato !== 'enlace' ? null : cambios.enlace !== undefined ? cambios.enlace : instrumento.enlace
  if (cambios.enlace && formato !== 'enlace') {
    throw new ErrorValidacion({ enlace: 'Solo una instancia en formato enlace lleva enlace.' })
  }
  const fechaPlanificada =
    cambios.fechaPlanificada !== undefined ? cambios.fechaPlanificada : instrumento.fechaPlanificada
  const datos = {
    origen: formato,
    clavePlantilla: formato === 'plantilla' ? plantillaPara(instrumento.aspecto.clave, tipo) : null,
    enlace,
    fechaPlanificada,
  }

  const antes = {
    formato: instrumento.origen,
    enlace: instrumento.enlace,
    fechaPlanificada: instrumento.fechaPlanificada
      ? aFechaCalendario(instrumento.fechaPlanificada)
      : null,
  }
  const despues = {
    formato,
    enlace,
    fechaPlanificada: fechaPlanificada ? aFechaCalendario(fechaPlanificada) : null,
  }
  if (JSON.stringify(antes) === JSON.stringify(despues)) {
    return obtenerPonderacion(actividad.idActividad)
  }

  await prisma.$transaction(async (tx) => {
    await tx.instrumento.update({ where: { idInstrumento }, data: datos })
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'instrumento_modificado',
      tipoEntidad: 'instrumento',
      idEntidad: idInstrumento,
      datos: { nombre: instrumento.nombre, antes, despues },
      categoria: 'estructura',
    })
  })

  return obtenerPonderacion(actividad.idActividad)
}
