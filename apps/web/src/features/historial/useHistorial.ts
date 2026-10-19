import { useInfiniteQuery } from '@tanstack/react-query'
import { claveActividad } from '../actividades'
import { obtenerHistorial } from './historial.api'

// docs/diseno-desarrollo-nucleo.md §4.2: el historial cuelga de la clave de
// la actividad, así que cualquier mutación registrable (que invalida esa
// clave) también lo refresca. Con una consulta infinita, TanStack Query
// vuelve a pedir, en orden, todas las páginas que ya estaban cargadas (no
// solo la primera): la persona no pierde cuánto había cargado al refrescar.
export function claveHistorial(idActividad: string, idEquipo?: string) {
  return [...claveActividad(idActividad), 'historial', idEquipo ?? 'completo'] as const
}

// `enabled` en false: para PanelHistorial, que siempre está montado (el
// panel decide si se pinta) y solo debe pedir mientras está abierto. Página
// por cursor (nucleo §3.1): el historial no tiene cota de tamaño. idEquipo
// acota la vista a ese equipo (entrypoint de Historial en el espacio de
// equipo); sin él, la vista completa de siempre.
export function useHistorial(
  idActividad: string,
  opciones?: { enabled?: boolean; idEquipo?: string },
) {
  return useInfiniteQuery({
    queryKey: claveHistorial(idActividad, opciones?.idEquipo),
    queryFn: ({ pageParam }) => obtenerHistorial(idActividad, pageParam, opciones?.idEquipo),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.cursorSiguiente ?? undefined,
    enabled: opciones?.enabled ?? true,
  })
}
