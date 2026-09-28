import type { Periodicidad } from './actividades.js'

// Genera el calendario de avances a partir de una periodicidad
// (docs/diseno-desarrollo-nucleo.md §9.2, P-28): periodos consecutivos y sin
// huecos entre la fecha de inicio y la de término de la actividad, ambas
// inclusivas. El último se recorta a la fecha de término. Las fechas son de
// calendario, guardadas como medianoche UTC (ver aFechaCalendario en
// actividades.service.ts), así que toda la aritmética es en UTC.
//
// Vive en shared porque lo usan el servidor, para crear los periodos, y el
// cliente, para reconocer con qué periodicidad se generó un calendario ya
// guardado (la API guarda periodos explícitos, no la periodicidad). Con una
// copia en cada lado, la aritmética de meses podría discrepar en los bordes.

// Tope para que una actividad con un rango absurdo (o una periodicidad
// demasiado corta para su duración) no genere miles de filas. 120 cubre,
// por ejemplo, más de dos años de periodos semanales.
export const LIMITE_PERIODOS = 120

export interface PeriodoGenerado {
  orden: number
  fechaInicio: Date
  fechaFin: Date
}

const DIA_MS = 24 * 60 * 60 * 1000
const DIAS_POR_PERIODICIDAD = { semanal: 7, quincenal: 14 } as const

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA_MS)
}

// Conserva el día del mes de `base`; si el mes destino es más corto usa su
// último día (31 de enero + 1 mes = 28 de febrero). Se calcula siempre desde
// `base` y no encadenando, para no arrastrar el recorte: 31 ene → 28 feb →
// 31 mar, no 28 mar.
function sumarMeses(base: Date, meses: number): Date {
  const anio = base.getUTCFullYear()
  const mes = base.getUTCMonth() + meses
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  return new Date(Date.UTC(anio, mes, Math.min(base.getUTCDate(), ultimoDia)))
}

function inicioDelPeriodo(inicio: Date, periodicidad: Periodicidad, indice: number): Date {
  return periodicidad === 'mensual'
    ? sumarMeses(inicio, indice)
    : sumarDias(inicio, indice * DIAS_POR_PERIODICIDAD[periodicidad])
}

// Se detiene al pasar LIMITE_PERIODOS: quien llama compara la longitud del
// resultado contra el límite y decide el error, sin que aquí se materialicen
// millones de filas.
export function generarPeriodos(
  fechaInicio: Date,
  fechaTermino: Date,
  periodicidad: Periodicidad,
): PeriodoGenerado[] {
  const periodos: PeriodoGenerado[] = []

  for (let indice = 0; periodos.length <= LIMITE_PERIODOS; indice += 1) {
    const inicio = inicioDelPeriodo(fechaInicio, periodicidad, indice)
    if (inicio > fechaTermino) break

    const siguiente = inicioDelPeriodo(fechaInicio, periodicidad, indice + 1)
    const finNatural = sumarDias(siguiente, -1)
    periodos.push({
      orden: indice + 1,
      fechaInicio: inicio,
      fechaFin: finNatural > fechaTermino ? fechaTermino : finNatural,
    })
  }

  return periodos
}
