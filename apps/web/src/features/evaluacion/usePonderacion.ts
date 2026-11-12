import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claveActividad } from '../actividades/useActividades'
import {
  actualizarInstrumento,
  definirInstrumentos,
  guardarPeso,
  obtenerPonderacion,
  type CambiosInstrumento,
  type DefinicionInstrumentos,
} from './ponderacion.api'

// Cuelga de la actividad, como los periodos: una invalidación de la
// actividad no deja la ponderación obsoleta por separado (nucleo §4.2).
export function clavePonderacion(idActividad: string) {
  return [...claveActividad(idActividad), 'ponderacion'] as const
}

export function usePonderacion(idActividad: string) {
  return useQuery({
    queryKey: clavePonderacion(idActividad),
    queryFn: () => obtenerPonderacion(idActividad),
    enabled: Boolean(idActividad),
  })
}

// Las tres mutaciones responden con la ponderación nueva: se escribe en la
// caché en lugar de pedirla otra vez.

export function useGuardarPesoMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      parte,
      id,
      peso,
    }: {
      parte: 'componente' | 'aspecto'
      id: string
      peso: number
    }) => guardarPeso(idActividad, parte, id, peso),
    onSuccess: (ponderacion) =>
      queryClient.setQueryData(clavePonderacion(idActividad), ponderacion),
  })
}

export function useDefinirInstrumentosMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idAspecto,
      definicion,
    }: {
      idAspecto: string
      definicion: DefinicionInstrumentos
    }) => definirInstrumentos(idActividad, idAspecto, definicion),
    onSuccess: (ponderacion) =>
      queryClient.setQueryData(clavePonderacion(idActividad), ponderacion),
  })
}

export function useActualizarInstrumentoMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idInstrumento,
      cambios,
    }: {
      idInstrumento: string
      cambios: CambiosInstrumento
    }) => actualizarInstrumento(idActividad, idInstrumento, cambios),
    onSuccess: (ponderacion) =>
      queryClient.setQueryData(clavePonderacion(idActividad), ponderacion),
  })
}
