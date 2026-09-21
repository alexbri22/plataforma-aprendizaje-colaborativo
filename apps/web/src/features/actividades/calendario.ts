import type { Periodicidad, PeriodoReporte } from '@plataforma/shared'

// Lógica de presentación del calendario de avances. El servidor guarda
// periodos explícitos y no una periodicidad (docs/diseno-desarrollo-nucleo.md
// §9.2, registro de decisión), así que la periodicidad que muestra la
// pantalla se deduce de las fechas.

export type PeriodicidadInferida = Periodicidad | 'ninguna' | 'personalizada'

const DIA_MS = 24 * 60 * 60 * 1000

function diaAbsoluto(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Math.round(Date.UTC(anio, mes - 1, dia) / DIA_MS)
}

function duracion(periodo: PeriodoReporte): number {
  return diaAbsoluto(periodo.fechaFin) - diaAbsoluto(periodo.fechaInicio) + 1
}

// Reconoce un calendario tal como lo genera el servidor: periodos seguidos,
// sin huecos, todos de la misma duración salvo el último, que puede ser más
// corto (se recorta a la fecha de término). Cualquier ajuste manual que rompa
// eso, o un calendario de un solo periodo (que no dice nada de la
// periodicidad), se reporta como 'personalizada'. Los periodos cancelados
// cuentan igual: conservan sus fechas.
export function inferirPeriodicidad(periodos: PeriodoReporte[]): PeriodicidadInferida {
  if (periodos.length === 0) return 'ninguna'
  if (periodos.length === 1) return 'personalizada'

  const ordenados = [...periodos].sort((a, b) => a.orden - b.orden)
  for (let i = 1; i < ordenados.length; i += 1) {
    if (diaAbsoluto(ordenados[i].fechaInicio) !== diaAbsoluto(ordenados[i - 1].fechaFin) + 1) {
      return 'personalizada'
    }
  }

  const completos = ordenados.slice(0, -1).map(duracion)
  const ultimo = duracion(ordenados[ordenados.length - 1])

  if (completos.every((d) => d === 7) && ultimo <= 7) return 'semanal'
  if (completos.every((d) => d === 14) && ultimo <= 14) return 'quincenal'
  if (completos.every((d) => d >= 28 && d <= 31) && ultimo <= 31) return 'mensual'
  return 'personalizada'
}

export interface ResumenCalendario {
  /** Inicio del primer avance activo, o null si no hay ninguno activo. */
  inicio: string | null
  /** Fin del último avance activo, o null si no hay ninguno activo. */
  fin: string | null
  activos: number
  cancelados: number
}

// Las fechas de la tabla de configuración abarcan solo los periodos activos:
// un avance cancelado ya no forma parte de lo que el equipo debe entregar.
export function resumirCalendario(periodos: PeriodoReporte[]): ResumenCalendario {
  const activos = periodos.filter((p) => p.estado === 'activo')
  return {
    inicio: activos.length > 0 ? activos.map((p) => p.fechaInicio).sort()[0] : null,
    fin:
      activos.length > 0
        ? activos
            .map((p) => p.fechaFin)
            .sort()
            .reverse()[0]
        : null,
    activos: activos.length,
    cancelados: periodos.length - activos.length,
  }
}
