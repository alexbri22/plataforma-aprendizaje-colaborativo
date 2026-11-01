import { LONGITUD_MAXIMA_CONTENIDO_COMENTARIO, type Comentario } from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { formatearFechaHora } from '../actividades'
import { AvisoError, Button, IconoCargando, Textarea } from '../../components/ui'
import styles from './ListaComentarios.module.css'

function mensajeDe(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No pudimos completar la acción. Intenta de nuevo.'
}

interface ItemComentarioProps {
  comentario: Comentario
  puedeEditar: boolean
  onGuardar: (contenido: string) => Promise<void>
}

// Un comentario, con edición en contexto para su autor (nucleo §10.4: solo
// el autor edita). El autor es siempre quien organiza o co-organiza — los
// participantes nunca ven este botón porque puedeEditar depende de
// idMiMembresia === comentario.idMembresiaAutor, y ellos no escriben
// comentarios.
function ItemComentario({ comentario, puedeEditar, onGuardar }: ItemComentarioProps) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(comentario.contenido)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function manejarGuardar(evento: FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(borrador)
      setEditando(false)
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      setGuardando(false)
    }
  }

  if (editando) {
    return (
      <li className={styles.comentario}>
        <form onSubmit={manejarGuardar} className={styles.formulario}>
          <Textarea
            label="Comentario"
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            maxLength={LONGITUD_MAXIMA_CONTENIDO_COMENTARIO}
            autoFocus
          />
          {error ? <AvisoError mensaje={error} /> : null}
          <div className={styles.acciones}>
            <Button type="submit" size="sm" disabled={guardando || borrador.trim() === ''}>
              {guardando ? <IconoCargando size={14} /> : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={guardando}
              onClick={() => {
                setBorrador(comentario.contenido)
                setEditando(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={styles.comentario}>
      <p className={styles.contenido}>{comentario.contenido}</p>
      <div className={styles.pie}>
        <span className={styles.autoria}>
          {comentario.autor} · {formatearFechaHora(comentario.fechaActualizacion)}
        </span>
        {puedeEditar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setBorrador(comentario.contenido)
              setEditando(true)
            }}
          >
            Editar
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export interface ListaComentariosProps {
  comentarios: Comentario[] | undefined
  cargando: boolean
  esError: boolean
  idMiMembresia: string | undefined
  puedeComentar: boolean
  creando: boolean
  onCrear: (contenido: string) => Promise<void>
  onEditar: (idComentario: string, contenido: string) => Promise<void>
}

// Comentarios sobre un elemento del espacio de equipo o una entrada de
// bitácora (nucleo §10.4): quien los escribe es siempre el organizador o un
// co-organizador con `calificar_y_comentar`, nunca un participante, por eso
// no hay botón de "responder". La visibilidad de quién ve esta lista ya se
// decidió antes de llegar aquí (es la del elemento o de la entrada).
export function ListaComentarios({
  comentarios,
  cargando,
  esError,
  idMiMembresia,
  puedeComentar,
  creando,
  onCrear,
  onEditar,
}: ListaComentariosProps) {
  const [nuevo, setNuevo] = useState('')
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)

  async function manejarCrear(evento: FormEvent) {
    evento.preventDefault()
    setErrorNuevo(null)
    try {
      await onCrear(nuevo)
      setNuevo('')
    } catch (e) {
      setErrorNuevo(mensajeDe(e))
    }
  }

  if (cargando) return null
  if (esError) return <AvisoError mensaje="No pudimos cargar los comentarios." />

  const lista = comentarios ?? []
  if (lista.length === 0 && !puedeComentar) return null

  return (
    <div className={styles.seccion}>
      {lista.length > 0 ? (
        <ul className={styles.lista}>
          {lista.map((comentario) => (
            <ItemComentario
              key={comentario.id}
              comentario={comentario}
              puedeEditar={comentario.idMembresiaAutor === idMiMembresia}
              onGuardar={(contenido) => onEditar(comentario.id, contenido)}
            />
          ))}
        </ul>
      ) : null}

      {puedeComentar ? (
        <form onSubmit={manejarCrear} className={styles.formulario}>
          <Textarea
            label="Agregar comentario"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            maxLength={LONGITUD_MAXIMA_CONTENIDO_COMENTARIO}
          />
          {errorNuevo ? <AvisoError mensaje={errorNuevo} /> : null}
          <Button type="submit" size="sm" disabled={creando || nuevo.trim() === ''}>
            {creando ? <IconoCargando size={14} /> : 'Comentar'}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
