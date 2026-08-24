import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  aceptarInvitacion,
  crearActividad,
  obtenerActividad,
  obtenerActividades,
  obtenerInvitaciones,
  rechazarInvitacion,
  type DatosCrearActividad,
} from './actividades.api'

// docs/diseno-desarrollo-nucleo.md §4.2 fija ['actividades'] y
// ['actividades', id] como claves para "Actividades del usuario" y "Una
// actividad con sus capacidades". Se reutilizan aquí para que sustituir el
// origen de datos por el backend real no cambie ninguna clave ni
// invalidación.
export const CLAVE_ACTIVIDADES = ['actividades'] as const
export const CLAVE_INVITACIONES = ['invitaciones'] as const

function claveActividad(id: string) {
  return [...CLAVE_ACTIVIDADES, id] as const
}

export function useActividades() {
  return useQuery({ queryKey: CLAVE_ACTIVIDADES, queryFn: obtenerActividades })
}

export function useActividad(id: string) {
  return useQuery({ queryKey: claveActividad(id), queryFn: () => obtenerActividad(id) })
}

export function useInvitaciones() {
  return useQuery({ queryKey: CLAVE_INVITACIONES, queryFn: obtenerInvitaciones })
}

export function useCrearActividadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosCrearActividad) => crearActividad(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_ACTIVIDADES })
    },
  })
}

export function useAceptarInvitacionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => aceptarInvitacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_ACTIVIDADES })
      queryClient.invalidateQueries({ queryKey: CLAVE_INVITACIONES })
    },
  })
}

export function useRechazarInvitacionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rechazarInvitacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_INVITACIONES })
    },
  })
}
