import { ListaComentarios } from './ListaComentarios'
import {
  useComentariosDeEntrada,
  useCrearComentarioSobreEntradaMutation,
  useEditarComentarioMutation,
  claveComentariosDeEntrada,
} from './useComentarios'

export interface ComentariosDeEntradaProps {
  idEntrada: string
  idMiMembresia: string | undefined
  /** Organizador o co-organizador con `calificar_y_comentar` (nucleo §10.4). */
  puedeComentar: boolean
  /** Si el actor puede ver esta entrada (su autor, u organiza/co-organiza
   * con `leer_bitacoras`, P-06): solo entonces tiene sentido pedir sus
   * comentarios, que no pueden ser más visibles que la entrada misma. */
  puedeVerEntrada: boolean
}

// Comentarios sobre una entrada de bitácora: visibilidad heredada de la
// entrada (concepto §5.3), nunca más amplia que ella.
export function ComentariosDeEntrada({
  idEntrada,
  idMiMembresia,
  puedeComentar,
  puedeVerEntrada,
}: ComentariosDeEntradaProps) {
  const comentariosQuery = useComentariosDeEntrada(idEntrada, { enabled: puedeVerEntrada })
  const crear = useCrearComentarioSobreEntradaMutation(idEntrada)
  const editar = useEditarComentarioMutation(claveComentariosDeEntrada(idEntrada))

  if (!puedeVerEntrada) return null

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
