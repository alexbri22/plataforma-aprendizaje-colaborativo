// Las transiciones automáticas por vencimiento de fecha se evalúan contra
// el final del día en la zona horaria de la plataforma, fijada en
// América/Ciudad_de_México (docs/diseno-desarrollo-nucleo.md §3.1 y §7.5).
// México dejó de observar horario de verano desde 2022, así que el
// desplazamiento contra UTC es siempre -6 horas: no hace falta resolver
// reglas de DST para este cálculo.
const DESPLAZAMIENTO_CDMX_HORAS = 6

// Las fechas de calendario del dominio (fechaLimiteInscripcion, etc.) se
// guardan como medianoche UTC del día correspondiente (ver
// aFechaCalendario, más abajo). El final de ese día en CDMX
// cae 24 + 6 horas después de esa medianoche UTC.
export function finDeDiaEnCDMX(fechaCalendario: Date): Date {
  const unDiaMas = 24 * 60 * 60 * 1000
  const desplazamiento = DESPLAZAMIENTO_CDMX_HORAS * 60 * 60 * 1000
  return new Date(fechaCalendario.getTime() + unDiaMas + desplazamiento - 1)
}

// `new Date` normaliza fechas de calendario inexistentes (2026-02-30 se
// vuelve 2026-03-02 en vez de fallar) y acepta formatos fuera del contrato
// YYYY-MM-DD. Se valida el formato con regex y se reconstruye la fecha para
// confirmar que conserva los mismos componentes antes de aceptarla.
export function parsearFechaCalendario(valor: unknown): Date | undefined {
  if (typeof valor !== 'string') return undefined
  const limpio = valor.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpio)) return undefined
  const parseada = new Date(`${limpio}T00:00:00.000Z`)
  return !Number.isNaN(parseada.getTime()) && parseada.toISOString().slice(0, 10) === limpio
    ? parseada
    : undefined
}

// Las fechas de calendario (inicio, término, límite de inscripción, periodos
// de reporte) son fechas y no instantes: se devuelven como YYYY-MM-DD y no
// como el datetime completo de Date#toISOString(), que es lo que espera
// apps/web/src/features/actividades/formato.ts al construir la fecha con
// año/mes/día locales (una fecha con hora rompe ese parseo y
// Intl.DateTimeFormat lanza sobre el resultado inválido).
export function aFechaCalendario(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}
