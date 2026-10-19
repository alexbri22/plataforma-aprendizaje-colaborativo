import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  crearComentarioSobreElemento,
  crearComentarioSobreEntrada,
  editarComentario,
  obtenerComentariosDeElemento,
  obtenerComentariosDeEntrada,
} from './comentarios.api'

// Comentarios sobre un elemento del espacio de equipo (nucleo §10.4).
// Cuelga de ['elementos', idElemento] y no de ['equipos', idEquipo]: editar
// un comentario no cambia el elemento, así que invalidar el equipo entero
// sería de más.
export function claveComentariosDeElemento(idElemento: string) {
  return ['elementos', idElemento, 'comentarios'] as const
}

export function useComentariosDeElemento(idElemento: string) {
  return useQuery({
    queryKey: claveComentariosDeElemento(idElemento),
    queryFn: () => obtenerComentariosDeElemento(idElemento),
    enabled: Boolean(idElemento),
  })
}

export function useCrearComentarioSobreElementoMutation(idElemento: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contenido: string) => crearComentarioSobreElemento(idElemento, contenido),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: claveComentariosDeElemento(idElemento) }),
  })
}

// Comentarios sobre una entrada de bitácora (nucleo §10.4).
export function claveComentariosDeEntrada(idEntrada: string) {
  return ['bitacora', idEntrada, 'comentarios'] as const
}

export function useComentariosDeEntrada(idEntrada: string, opciones: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: claveComentariosDeEntrada(idEntrada),
    queryFn: () => obtenerComentariosDeEntrada(idEntrada),
    enabled: Boolean(idEntrada) && (opciones.enabled ?? true),
  })
}

export function useCrearComentarioSobreEntradaMutation(idEntrada: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contenido: string) => crearComentarioSobreEntrada(idEntrada, contenido),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: claveComentariosDeEntrada(idEntrada) }),
  })
}

// Editar un comentario propio: invalida cualquiera de las dos colecciones a
// las que podría pertenecer (no sabe de antemano cuál sin otra consulta), y
// quien llama decide cuál es relevante pasando la clave correspondiente.
export function useEditarComentarioMutation(
  claveAInvalidar: ReturnType<typeof claveComentariosDeElemento | typeof claveComentariosDeEntrada>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idComentario, contenido }: { idComentario: string; contenido: string }) =>
      editarComentario(idComentario, contenido),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveAInvalidar }),
  })
}
