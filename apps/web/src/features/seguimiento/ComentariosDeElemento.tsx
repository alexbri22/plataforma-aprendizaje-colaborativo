import { ListaComentarios } from './ListaComentarios'
import {
  useComentariosDeElemento,
  useCrearComentarioSobreElementoMutation,
  useEditarComentarioMutation,
  claveComentariosDeElemento,
} from './useComentarios'

export interface ComentariosDeElementoProps {
  idElemento: string
  idMiMembresia: string | undefined
  /** Organizador o co-organizador con `calificar_y_comentar` (nucleo §10.4). */
  puedeComentar: boolean
}

// Comentarios sobre una meta, un avance o un recurso. La visibilidad de la
// lista misma ya la decidió el servidor al responder GET
// /api/elementos/{id}/comentarios con el mismo criterio que el elemento
// (concepto §5.3): quien ve esta tarjeta puede ver sus comentarios.
export function ComentariosDeElemento({
  idElemento,
  idMiMembresia,
  puedeComentar,
}: ComentariosDeElementoProps) {
  const comentariosQuery = useComentariosDeElemento(idElemento)
  const crear = useCrearComentarioSobreElementoMutation(idElemento)
  const editar = useEditarComentarioMutation(claveComentariosDeElemento(idElemento))

  return (
    <ListaComentarios
      comentarios={comentariosQuery.data}
      cargando={comentariosQuery.isPending}
      esError={comentariosQuery.isError}
      idMiMembresia={idMiMembresia}
      puedeComentar={puedeComentar}
      creando={crear.isPending}
      onCrear={async (contenido) => {
        await crear.mutateAsync(contenido)
      }}
      onEditar={async (idComentario, contenido) => {
        await editar.mutateAsync({ idComentario, contenido })
      }}
    />
  )
}
