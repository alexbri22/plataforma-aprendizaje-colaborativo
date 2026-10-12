import { useQuery } from '@tanstack/react-query'
import { claveActividad } from '../actividades'
import { obtenerHistorial } from './historial.api'

// docs/diseno-desarrollo-nucleo.md §4.2: el historial cuelga de la clave de
// la actividad, así que cualquier mutación registrable (que invalida esa
// clave) también lo refresca.
export function claveHistorial(idActividad: string) {
  return [...claveActividad(idActividad), 'historial'] as const
}

// `enabled` en false: para PanelHistorial, que siempre está montado (el
// panel decide si se pinta) y solo debe pedir mientras está abierto.
export function useHistorial(idActividad: string, opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: claveHistorial(idActividad),
    queryFn: () => obtenerHistorial(idActividad),
    enabled: opciones?.enabled ?? true,
  })
}
