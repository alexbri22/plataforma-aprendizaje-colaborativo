const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// Construye la fecha con año/mes/día locales en vez de parsear el ISO
// directo, para que una fecha como "2026-08-10" no se corra un día por
// interpretarse en UTC y mostrarse en una zona horaria detrás de UTC.
export function formatearFecha(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return FORMATO_FECHA.format(new Date(anio, mes - 1, dia))
}
