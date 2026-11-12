import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claveActividad } from '../actividades/useActividades'
import {
  capturarPuntaje,
  capturarPuntajeDeEquipo,
  obtenerCalificaciones,
  obtenerDesglose,
  obtenerProyectoPorEquipo,
} from './calificaciones.api'

// Todo cuelga de ['actividades', id, 'calificaciones']: un puntaje nuevo
// cambia la lista, los desgloses y el proyecto de una vez.
function claveCalificaciones(idActividad: string) {
  return [...claveActividad(idActividad), 'calificaciones'] as const
}

export function useCalificaciones(idActividad: string) {
  return useQuery({
    queryKey: [...claveCalificaciones(idActividad), 'lista'] as const,
    queryFn: () => obtenerCalificaciones(idActividad),
    enabled: Boolean(idActividad),
  })
}

export function useDesglose(idActividad: string, idMembresia: string, habilitado = true) {
  return useQuery({
    queryKey: [...claveCalificaciones(idActividad), 'desglose', idMembresia] as const,
    queryFn: () => obtenerDesglose(idActividad, idMembresia),
    enabled: Boolean(idActividad && idMembresia) && habilitado,
    retry: false,
  })
}

export function useProyectoPorEquipo(idActividad: string) {
  return useQuery({
    queryKey: [...claveCalificaciones(idActividad), 'proyecto'] as const,
    queryFn: () => obtenerProyectoPorEquipo(idActividad),
    enabled: Boolean(idActividad),
  })
}

// Tras capturar, se refresca lo calculado y la tabla de cada aspecto, que
// marca lo ya revisado.
function alCapturar(queryClient: ReturnType<typeof useQueryClient>, idActividad: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: claveCalificaciones(idActividad) }),
    queryClient.invalidateQueries({ queryKey: [...claveActividad(idActividad), 'cumplimiento'] }),
  ])
}

export function useCapturarPuntajeMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: { idInstrumento: string; idMembresia: string; valor: number | null }) =>
      capturarPuntaje(idActividad, datos.idInstrumento, datos.idMembresia, datos.valor),
    onSuccess: () => alCapturar(queryClient, idActividad),
  })
}

export function useCapturarPuntajeDeEquipoMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: { idInstrumento: string; idEquipo: string; valor: number | null }) =>
      capturarPuntajeDeEquipo(idActividad, datos.idInstrumento, datos.idEquipo, datos.valor),
    onSuccess: () => alCapturar(queryClient, idActividad),
  })
}
