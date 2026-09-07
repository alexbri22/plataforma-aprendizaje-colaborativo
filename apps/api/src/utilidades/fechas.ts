// Las transiciones automáticas por vencimiento de fecha se evalúan contra
// el final del día en la zona horaria de la plataforma, fijada en
// América/Ciudad_de_México (docs/diseno-desarrollo-nucleo.md §3.1 y §7.5).
// México dejó de observar horario de verano desde 2022, así que el
// desplazamiento contra UTC es siempre -6 horas: no hace falta resolver
// reglas de DST para este cálculo.
const DESPLAZAMIENTO_CDMX_HORAS = 6

// Las fechas de calendario del dominio (fechaLimiteInscripcion, etc.) se
// guardan como medianoche UTC del día correspondiente (ver
// aFechaCalendario en actividades.service.ts). El final de ese día en CDMX
// cae 24 + 6 horas después de esa medianoche UTC.
export function finDeDiaEnCDMX(fechaCalendario: Date): Date {
  const unDiaMas = 24 * 60 * 60 * 1000
  const desplazamiento = DESPLAZAMIENTO_CDMX_HORAS * 60 * 60 * 1000
  return new Date(fechaCalendario.getTime() + unDiaMas + desplazamiento - 1)
}
