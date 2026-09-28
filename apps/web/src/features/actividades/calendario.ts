import {
  generarPeriodos,
  PERIODICIDADES,
  type Periodicidad,
  type PeriodoReporte,
} from '@plataforma/shared'

// Lógica de presentación del calendario de avances. El servidor guarda
// periodos explícitos y no una periodicidad (docs/diseno-desarrollo-nucleo.md
// §9.2, registro de decisión), así que la periodicidad que muestra la
// pantalla se deduce de las fechas.

export type PeriodicidadInferida = Periodicidad | 'ninguna' | 'personalizada'

function comoFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`)
}

function comoTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

// Reconoce un calendario solo si el servidor lo habría generado con alguna
// periodicidad: se vuelve a generar con el mismo generador (de shared), desde
// el inicio del primer periodo hasta el fin del último, y se compara periodo
// por periodo. No basta mirar las duraciones: "mensual" ancla cada inicio al
// día del primer periodo (31 ene, 28 feb, 31 mar, 30 abr), así que una
// secuencia con duraciones de mes pero otros bordes no es un mensual, y elegir
// "Mensual" en la pantalla la reemplazaría por otro calendario.
//
// Cualquier ajuste manual de fechas, o un calendario de un solo periodo (que
// no dice nada de la periodicidad), se reporta como 'personalizada'. Los
// periodos cancelados cuentan igual: conservan sus fechas.
export function inferirPeriodicidad(periodos: PeriodoReporte[]): PeriodicidadInferida {
  if (periodos.length === 0) return 'ninguna'
  if (periodos.length === 1) return 'personalizada'

  const ordenados = [...periodos].sort((a, b) => a.orden - b.orden)
  const inicio = comoFecha(ordenados[0].fechaInicio)
  const termino = comoFecha(ordenados[ordenados.length - 1].fechaFin)

  const coincidente = PERIODICIDADES.find((periodicidad) => {
    const esperados = generarPeriodos(inicio, termino, periodicidad)
    return (
      esperados.length === ordenados.length &&
      esperados.every(
        (esperado, i) =>
          comoTexto(esperado.fechaInicio) === ordenados[i].fechaInicio &&
          comoTexto(esperado.fechaFin) === ordenados[i].fechaFin,
      )
    )
  })
  return coincidente ?? 'personalizada'
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
