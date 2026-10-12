import type { ElementoEspacioEquipo } from '@plataforma/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claveEquipo } from '../equipos/useEquipos'
import { crearElemento, editarElemento, eliminarElemento, obtenerElementos } from './elementos.api'

// Cuelga de ['equipos', idEquipo] (nucleo §4.2, "escribir en el espacio de un
// equipo invalida ese equipo") y no de la actividad: dos equipos de la misma
// actividad no se invalidan entre sí.
export function claveElementos(idEquipo: string, tipo: ElementoEspacioEquipo) {
  return [...claveEquipo(idEquipo), 'elementos', tipo] as const
}

export function useElementos(idEquipo: string, tipo: ElementoEspacioEquipo) {
  return useQuery({
    queryKey: claveElementos(idEquipo, tipo),
    queryFn: () => obtenerElementos(idEquipo, tipo),
  })
}

function useInvalidarElementos(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: claveElementos(idEquipo, tipo) })
}

export function useCrearElementoMutation(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const invalidar = useInvalidarElementos(idEquipo, tipo)
  return useMutation({
    mutationFn: (contenido: string) => crearElemento(idEquipo, tipo, contenido),
    onSuccess: invalidar,
  })
}

export function useEditarElementoMutation(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const invalidar = useInvalidarElementos(idEquipo, tipo)
  return useMutation({
    mutationFn: ({ idElemento, contenido }: { idElemento: string; contenido: string }) =>
      editarElemento(idElemento, contenido),
    onSuccess: invalidar,
  })
}

export function useEliminarElementoMutation(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const invalidar = useInvalidarElementos(idEquipo, tipo)
  return useMutation({
    mutationFn: (idElemento: string) => eliminarElemento(idElemento),
    onSuccess: invalidar,
  })
}
