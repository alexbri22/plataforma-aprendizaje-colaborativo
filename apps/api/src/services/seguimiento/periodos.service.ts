import type { EstadoActividad, PeriodoReporte as FilaPeriodo } from '@prisma/client'
import type { PeriodoReporte } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorPeriodoNoEncontrado, ErrorPeriodoTraslapado, ErrorValidacion } from '../../errores.js'
import { aFechaCalendario } from '../../utilidades/fechas.js'
import { generarPeriodos, LIMITE_PERIODOS } from '../../utilidades/periodos.js'
import { exigirAccion, type MembresiaConPermisos } from '../actividades/actividades.service.js'
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
    orden: fila.orden,
    fechaInicio: aFechaCalendario(fila.fechaInicio),
    fechaFin: aFechaCalendario(fila.fechaFin),
    estado: fila.estado,
  }
}

// GET /api/actividades/{id}/periodos: cualquier miembro puede consultarlos
// (nucleo §9.4). Incluye los cancelados: la interfaz los muestra tachados y
// permite reactivarlos.
export async function listarPeriodos(idActividad: string): Promise<PeriodoReporte[]> {
  const filas = await prisma.periodoReporte.findMany({
    where: { idActividad },
    orderBy: { orden: 'asc' },
  })
  return filas.map(aRespuesta)
}

// PUT /api/actividades/{id}/periodos: reemplaza el calendario completo.
// Descarta cualquier ajuste individual previo, por eso exige configurar_funciones
// (fases previas al desarrollo) y no la acción más laxa de ajustar un periodo.
// Cuando existan reportes que apunten a un periodo (nucleo §9.2, id_periodo
// en el reporte), regenerar tendrá que rechazarse si alguno ya tiene
// reportes; hoy no hay dónde comprobarlo.
export async function definirPeriodos(
  actividad: ActividadParaPeriodos,
  periodicidad: PeriodicidadSolicitada,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<PeriodoReporte[]> {
  exigirAccion(
    membresiaActor,
    'configurar_funciones',
    actividad.estado,
    'El calendario no puede regenerarse en esta fase.',
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
    await tx.periodoReporte.deleteMany({ where: { idActividad } })
    await tx.periodoReporte.createMany({
      data: periodos.map((periodo) => ({ idActividad, ...periodo })),
    })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'periodos_definidos',
      tipoEntidad: 'periodos_reporte',
      idEntidad: idActividad,
      datos: { periodicidad, numeroPeriodos: periodos.length },
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
    'Los periodos no pueden ajustarse en esta fase.',
  )

  const { idActividad } = actividad
  const actual = await prisma.periodoReporte.findFirst({ where: { idPeriodo, idActividad } })
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
    const traslapado = await prisma.periodoReporte.findFirst({
      where: {
        idActividad,
        idPeriodo: { not: idPeriodo },
        estado: 'activo',
        fechaInicio: { lte: siguiente.fechaFin },
        fechaFin: { gte: siguiente.fechaInicio },
      },
    })
    if (traslapado) throw new ErrorPeriodoTraslapado(traslapado.orden)
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const fila = await tx.periodoReporte.update({ where: { idPeriodo }, data: siguiente })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'periodo_modificado',
      tipoEntidad: 'periodo_reporte',
      idEntidad: idPeriodo,
      datos: {
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
