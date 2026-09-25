import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CLAVE_ACTIVIDADES, claveActividad } from '../actividades'
import {
  asignarIntegrante,
  cerrarFormacion,
  crearEquipo,
  editarEquipo,
  eliminarEquipo,
  obtenerEquipos,
  retirarIntegrante,
  type CambiosEquipo,
} from './equipos.api'

// docs/diseno-desarrollo-nucleo.md §4.2: los equipos cuelgan de la clave de
// la actividad, así que invalidar ['actividades', id] los refresca también.
export function claveEquipos(idActividad: string) {
  return [...claveActividad(idActividad), 'equipos'] as const
}

export function useEquipos(idActividad: string) {
  return useQuery({
    queryKey: claveEquipos(idActividad),
    queryFn: () => obtenerEquipos(idActividad),
  })
}

// Toda mutación de equipos invalida la actividad completa (§4.2, "Asignar o
// mover un participante"): con la formación autogestionada, la última
// asignación puede avanzar la actividad a desarrollo y con ella cambian las
// capacidades. También arrastra los equipos y los participantes, que cuelgan
// de esa clave.
function useInvalidarActividad(idActividad: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: claveActividad(idActividad) })
}

export function useCrearEquipoMutation(idActividad: string) {
  const invalidar = useInvalidarActividad(idActividad)
  return useMutation({
    mutationFn: (nombre: string) => crearEquipo(idActividad, nombre),
    onSuccess: invalidar,
  })
}

export function useAsignarIntegranteMutation(idActividad: string) {
  const invalidar = useInvalidarActividad(idActividad)
  return useMutation({
    mutationFn: ({ idEquipo, idMembresia }: { idEquipo: string; idMembresia: string }) =>
      asignarIntegrante(idEquipo, idMembresia),
    onSuccess: invalidar,
  })
}

export function useRetirarIntegranteMutation(idActividad: string) {
  const invalidar = useInvalidarActividad(idActividad)
  return useMutation({
    mutationFn: ({ idEquipo, idMembresia }: { idEquipo: string; idMembresia: string }) =>
      retirarIntegrante(idEquipo, idMembresia),
    onSuccess: invalidar,
  })
}

export function useEditarEquipoMutation(idActividad: string) {
  const invalidar = useInvalidarActividad(idActividad)
  return useMutation({
    mutationFn: ({ idEquipo, cambios }: { idEquipo: string; cambios: CambiosEquipo }) =>
      editarEquipo(idEquipo, cambios),
    onSuccess: invalidar,
  })
}

export function useEliminarEquipoMutation(idActividad: string) {
  const invalidar = useInvalidarActividad(idActividad)
  return useMutation({
    mutationFn: (idEquipo: string) => eliminarEquipo(idEquipo),
    onSuccess: invalidar,
  })
}

// Avanzar de fase también cambia el badge de "Mis actividades" (§4.2).
export function useCerrarFormacionMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cerrarFormacion(idActividad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claveActividad(idActividad) })
      queryClient.invalidateQueries({ queryKey: CLAVE_ACTIVIDADES })
    },
  })
}
