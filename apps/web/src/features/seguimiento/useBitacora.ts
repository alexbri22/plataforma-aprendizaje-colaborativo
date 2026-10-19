import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claveActividad } from '../actividades'
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
    mutationFn: (contenido: string) => crearEntradaBitacora(idActividad, contenido),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveBitacora(idActividad) }),
  })
}

export function useEditarEntradaBitacoraMutation(idActividad: string, idMembresia?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idEntrada, contenido }: { idEntrada: string; contenido: string }) =>
      editarEntradaBitacora(idEntrada, contenido),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: claveBitacora(idActividad, idMembresia) }),
  })
}
