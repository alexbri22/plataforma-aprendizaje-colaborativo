import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claveActividad } from '../actividades'
import type { RespuestasBitacora } from '@plataforma/shared'
import { crearEntradaBitacora, editarEntradaBitacora, obtenerBitacora } from './bitacora.api'

// Cuelga de ['actividades', idActividad] y no de una clave propia: es
// contenido de la actividad, igual que los participantes, y así una
// invalidación de la actividad no deja la bitácora obsoleta por separado.
export function claveBitacora(idActividad: string, idMembresia?: string) {
  return [...claveActividad(idActividad), 'bitacora', idMembresia ?? 'propia'] as const
}

export function useBitacora(idActividad: string, idMembresia?: string) {
  return useQuery({
    queryKey: claveBitacora(idActividad, idMembresia),
    queryFn: () => obtenerBitacora(idActividad, idMembresia),
    enabled: Boolean(idActividad),
  })
}

export function useCrearEntradaBitacoraMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (respuestas: RespuestasBitacora) => crearEntradaBitacora(idActividad, respuestas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveBitacora(idActividad) }),
  })
}

export function useEditarEntradaBitacoraMutation(idActividad: string, idMembresia?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idEntrada,
      respuestas,
    }: {
      idEntrada: string
      respuestas: RespuestasBitacora
    }) => editarEntradaBitacora(idEntrada, respuestas),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: claveBitacora(idActividad, idMembresia) }),
  })
}
