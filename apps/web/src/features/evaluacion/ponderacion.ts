import {
  generarPeriodos,
  PERIODICIDADES,
  type AspectoDePonderacion,
  type Periodicidad,
} from '@plataforma/shared'

// El servidor guarda las instancias de un aspecto con su fecha planificada y
// no una periodicidad, igual que el calendario de avances, así que la
// periodicidad se deduce (general §4.2).

function comoFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`)
}

/** La periodicidad con la que el servidor habría generado esas instancias;
 * 'ninguna' si es una sola sin fecha, y 'personalizada' si se movieron fechas
 * en el calendario (mismo criterio que el de Avances, calendario.ts). Se prueba de la más amplia a la más
 * corta: en una actividad breve, mensual y quincenal pueden dar la misma única
 * instancia, y quien eligió la más amplia debe seguir viéndola. */
export function periodicidadDeAspecto(
  aspecto: AspectoDePonderacion,
  fechaInicioActividad: string,
  fechaTerminoActividad: string,
): Periodicidad | 'ninguna' | 'personalizada' {
  const fechas = aspecto.instrumentos.map((i) => i.fechaPlanificada)
  if (fechas.length === 0 || (fechas.length === 1 && fechas[0] === null)) return 'ninguna'
  for (const periodicidad of [...PERIODICIDADES].reverse()) {
    const periodos = generarPeriodos(
      comoFecha(fechaInicioActividad),
      comoFecha(fechaTerminoActividad),
      periodicidad,
    )
    const iguales =
      periodos.length === fechas.length &&
      periodos.every((p, i) => p.fechaInicio.toISOString().slice(0, 10) === fechas[i])
    if (iguales) return periodicidad
  }
  return 'personalizada'
}
