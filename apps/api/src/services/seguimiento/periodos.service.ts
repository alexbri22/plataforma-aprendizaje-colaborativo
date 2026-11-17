import type { EstadoActividad, Prisma, PeriodoReporte as FilaPeriodo } from '@prisma/client'
import {
  ELEMENTOS_ESPACIO_EQUIPO,
  generarPeriodos,
  LIMITE_PERIODOS,
  type ElementoConCalendario,
  type EntregasDePeriodo,
  type PeriodoReporte,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorPeriodoNoEncontrado, ErrorPeriodoTraslapado, ErrorValidacion } from '../../errores.js'
import { aFechaCalendario, finDeDiaEnCDMX, inicioDeDiaEnCDMX } from '../../utilidades/fechas.js'
import {
  exigirAccion,
  type MembresiaActor,
  type MembresiaConPermisos,
} from '../actividades/actividades.service.js'
import {
  idsDeEquiposDeActividad,
  obtenerIdEquipoDeMembresia,
  participantesConEquipo,
} from '../equipos/equipos.service.js'
import { registrarEvento } from '../historial/historial.service.js'
import type { CambiosPeriodo, PeriodicidadSolicitada } from './validacion.js'

// Periodos de reporte (docs/diseno-desarrollo-nucleo.md §9.2 y P-28): el
// calendario de los avances de una actividad. Este módulo es el único que
// lee y escribe la tabla; de la actividad solo necesita lo que ya cargó el
// middleware de contexto (fase y fechas) y la autorización, que sigue siendo
// de Actividades (exigirAccion).

export interface ActividadParaPeriodos {
  idActividad: string
  estado: EstadoActividad
  fechaInicio: Date
  fechaTermino: Date
}

function aRespuesta(fila: FilaPeriodo): PeriodoReporte {
  return {
    id: fila.idPeriodo,
    elemento: fila.elemento as ElementoConCalendario,
    orden: fila.orden,
    fechaInicio: aFechaCalendario(fila.fechaInicio),
    fechaFin: aFechaCalendario(fila.fechaFin),
    estado: fila.estado,
  }
}

// Los periodos activos de una actividad no se traslapan, y la base no lo
// impone: lo comprueba el servicio antes de escribir. Esa comprobación y la
// escritura tienen que ser una sola pieza, porque dos ajustes simultáneos que
// mueven periodos distintos al mismo rango libre pasarían cada uno la
// comprobación sin ver al otro, y los dos confirmarían. Todo escritor de
// periodos toma primero este candado sobre la fila de la actividad, así que
// los de una misma actividad van de uno en uno y el segundo ya ve lo que
// confirmó el primero. NO KEY UPDATE y no UPDATE: basta para excluirse entre
// sí y no estorba a los inserts con llave foránea hacia la actividad (unirse,
// registrar eventos).
async function bloquearPeriodosDeActividad(
  tx: Prisma.TransactionClient,
  idActividad: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id_actividad FROM actividades WHERE id_actividad = ${idActividad} FOR NO KEY UPDATE`
}

// GET /api/actividades/{id}/periodos: cualquier miembro puede consultarlos
// (nucleo §9.4). Incluye los cancelados: la interfaz los muestra tachados y
// permite reactivarlos.
export async function listarPeriodos(idActividad: string): Promise<PeriodoReporte[]> {
  const filas = await prisma.periodoReporte.findMany({
    where: { idActividad },
    orderBy: [{ elemento: 'asc' }, { orden: 'asc' }],
  })
  return filas.map(aRespuesta)
}

// GET /api/actividades/{id}/entregas-por-periodo (Operación de la
// planeación): por cada periodo activo de cada calendario, cuánto se publicó
// dentro de sus fechas. Mientras lo publicado no apunte a su periodo (nucleo
// §9.2, Fase B) la fecha es lo único que los une; los días se cuentan en la
// zona horaria de la plataforma, como los vencimientos. Los elementos del
// espacio de equipo cuentan equipos; la bitácora, participantes.
export async function entregasPorPeriodo(
  idActividad: string,
  membresia: MembresiaActor,
): Promise<EntregasDePeriodo[]> {
  const participa = membresia.rol === 'participante'
  const [periodos, idsEquipos, participantes, idMiEquipo] = await Promise.all([
    prisma.periodoReporte.findMany({
      where: { idActividad, estado: 'activo' },
      orderBy: [{ elemento: 'asc' }, { orden: 'asc' }],
    }),
    idsDeEquiposDeActividad(idActividad),
    participantesConEquipo(idActividad),
    participa ? obtenerIdEquipoDeMembresia(membresia.idMembresia) : Promise.resolve(null),
  ])
  const elementos = new Set(periodos.map((p) => p.elemento))
  const tipos = ELEMENTOS_ESPACIO_EQUIPO.filter((e) => elementos.has(e))
  const [delEquipo, entradasBitacora] = await Promise.all([
    tipos.length && idsEquipos.length
      ? prisma.elementoEspacioEquipo.findMany({
          where: { idEquipo: { in: idsEquipos }, tipoElemento: { in: tipos } },
          select: { idEquipo: true, tipoElemento: true, fechaCreacion: true },
        })
      : Promise.resolve([]),
    elementos.has('bitacora') && participantes.length
      ? prisma.bitacora.findMany({
          where: { idMembresia: { in: participantes } },
          select: { idMembresia: true, fechaCreacion: true },
        })
      : Promise.resolve([]),
  ])

  return periodos.map((periodo) => {
    const desde = inicioDeDiaEnCDMX(periodo.fechaInicio)
    const hasta = finDeDiaEnCDMX(periodo.fechaFin)
    const dentro = (fecha: Date) => fecha >= desde && fecha <= hasta
    if (periodo.elemento === 'bitacora') {
      const quienes = new Set(
        entradasBitacora.filter((e) => dentro(e.fechaCreacion)).map((e) => e.idMembresia),
      )
      return {
        idPeriodo: periodo.idPeriodo,
        hechos: quienes.size,
        total: participantes.length,
        unidad: 'participantes',
        mio: participa ? quienes.has(membresia.idMembresia) : null,
      }
    }
    const equipos = new Set(
      delEquipo
        .filter((e) => e.tipoElemento === periodo.elemento && dentro(e.fechaCreacion))
        .map((e) => e.idEquipo),
    )
    return {
      idPeriodo: periodo.idPeriodo,
      hechos: equipos.size,
      total: idsEquipos.length,
      unidad: 'equipos',
      mio: idMiEquipo ? equipos.has(idMiEquipo) : null,
    }
  })
}

// PUT /api/actividades/{id}/periodos: reemplaza el calendario completo.
// Descarta cualquier ajuste individual previo, por eso exige configurar_funciones
// (fases previas al desarrollo) y no la acción más laxa de ajustar un periodo.
// Cuando existan reportes que apunten a un periodo (nucleo §9.2, id_periodo
// en el reporte), regenerar tendrá que rechazarse si alguno ya tiene
// reportes; hoy no hay dónde comprobarlo.
export async function definirPeriodos(
  actividad: ActividadParaPeriodos,
  elemento: ElementoConCalendario,
  periodicidad: PeriodicidadSolicitada,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<PeriodoReporte[]> {
  exigirAccion(
    membresiaActor,
    'configurar_funciones',
    actividad.estado,
    'El calendario no puede regenerarse en esta etapa.',
  )

  const periodos =
    periodicidad === 'ninguna'
      ? []
      : generarPeriodos(actividad.fechaInicio, actividad.fechaTermino, periodicidad)

  if (periodos.length > LIMITE_PERIODOS) {
    throw new ErrorValidacion({
      periodicidad: `Esa periodicidad genera más de ${LIMITE_PERIODOS} periodos para la duración de la actividad. Elige una más amplia.`,
    })
  }

  const { idActividad } = actividad
  await prisma.$transaction(async (tx) => {
    await bloquearPeriodosDeActividad(tx, idActividad)
    await tx.periodoReporte.deleteMany({ where: { idActividad, elemento } })
    await tx.periodoReporte.createMany({
      data: periodos.map((periodo) => ({ idActividad, elemento, ...periodo })),
    })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'periodos_definidos',
      tipoEntidad: 'periodos_reporte',
      idEntidad: idActividad,
      datos: { elemento, periodicidad, numeroPeriodos: periodos.length },
      categoria: 'estructura',
    })
  })

  return listarPeriodos(idActividad)
}

// PATCH /api/actividades/{id}/periodos/{idPeriodo}: mueve las fechas de un
// periodo o lo cancela/reactiva. Es el ajuste "uno a uno" de P-28.
export async function actualizarPeriodo(
  actividad: ActividadParaPeriodos,
  idPeriodo: string,
  cambios: CambiosPeriodo,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<PeriodoReporte> {
  exigirAccion(
    membresiaActor,
    'ajustar_periodos',
    actividad.estado,
    'Los periodos no pueden ajustarse en esta etapa.',
  )

  const { idActividad } = actividad

  const actualizado = await prisma.$transaction(async (tx) => {
    await bloquearPeriodosDeActividad(tx, idActividad)

    // Se lee con el candado ya tomado: lo que otro ajuste confirmó mientras
    // esperábamos es lo que cuenta, no lo que había al llegar la petición.
    const actual = await tx.periodoReporte.findFirst({ where: { idPeriodo, idActividad } })
    if (!actual) throw new ErrorPeriodoNoEncontrado()

    const siguiente = {
      fechaInicio: cambios.fechaInicio ?? actual.fechaInicio,
      fechaFin: cambios.fechaFin ?? actual.fechaFin,
      estado: cambios.estado ?? actual.estado,
    }

    if (siguiente.fechaFin < siguiente.fechaInicio) {
      throw new ErrorValidacion({
        fechaFin: 'Debe ser igual o posterior a la fecha de inicio.',
      })
    }

    // Solo un periodo activo ocupa días: uno cancelado puede quedar traslapado
    // sin efecto, y esta comprobación se repite al reactivarlo.
    if (siguiente.estado === 'activo') {
      const traslapado = await tx.periodoReporte.findFirst({
        where: {
          idActividad,
          elemento: actual.elemento,
          idPeriodo: { not: idPeriodo },
          estado: 'activo',
          fechaInicio: { lte: siguiente.fechaFin },
          fechaFin: { gte: siguiente.fechaInicio },
        },
      })
      if (traslapado) throw new ErrorPeriodoTraslapado(traslapado.orden)
    }

    const fila = await tx.periodoReporte.update({ where: { idPeriodo }, data: siguiente })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'periodo_modificado',
      tipoEntidad: 'periodo_reporte',
      idEntidad: idPeriodo,
      datos: {
        elemento: actual.elemento,
        orden: actual.orden,
        antes: {
          fechaInicio: aFechaCalendario(actual.fechaInicio),
          fechaFin: aFechaCalendario(actual.fechaFin),
          estado: actual.estado,
        },
        despues: {
          fechaInicio: aFechaCalendario(fila.fechaInicio),
          fechaFin: aFechaCalendario(fila.fechaFin),
          estado: fila.estado,
        },
      },
      categoria: 'estructura',
    })

    return fila
  })

  return aRespuesta(actualizado)
}
