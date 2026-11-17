import type { EstadoPuntaje } from '@plataforma/shared'

const FORMATO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })

/** Un puntaje o porcentaje con a lo más dos decimales. */
export function formatearPuntaje(valor: number): string {
  return FORMATO.format(Math.round(valor * 100) / 100)
}

/** El estado de un instrumento para leerlo (nucleo §10.3). */
export function textoDePuntaje(puntaje: EstadoPuntaje): string {
  if (puntaje.estado === 'valor') return formatearPuntaje(puntaje.valor)
  return puntaje.estado === 'pendiente' ? 'Pendiente' : 'No aplica'
}
