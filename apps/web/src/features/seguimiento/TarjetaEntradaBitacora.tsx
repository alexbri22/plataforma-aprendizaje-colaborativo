import { LONGITUD_MAXIMA_CONTENIDO_BITACORA, type EntradaBitacora } from '@plataforma/shared'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatearFechaHora } from '../actividades'
import { AvisoError, Button, Card, IconoCargando, Textarea } from '../../components/ui'
import { ComentariosDeEntrada } from './ComentariosDeEntrada'
import { IconoChevron } from './IconoChevron'
import styles from './TarjetaElemento.module.css'

interface TarjetaEntradaBitacoraProps {
  entrada: EntradaBitacora
  /** Solo el autor edita una entrada propia (nucleo §9.4). */
  puedeEditar: boolean
  guardando: boolean
  error: string | null
  onGuardar: (contenido: string) => Promise<void>
  idMiMembresia: string | undefined
  /** Organizador o co-organizador con `calificar_y_comentar` (nucleo §10.4). */
  puedeComentar: boolean
  /** Llega ya expandida y con scroll hacia ella (clic en un evento del
   * historial, PanelHistorial) — ver TarjetaElemento. */
  expandidaInicial?: boolean
}

// Una entrada de bitácora. Mismo encabezado fijo que TarjetaElemento (no
// cambia colapsada o expandida; expandir solo revela el panel con el
// contenido completo, la acción de editar y los comentarios), por la misma
// razón: una bitácora de veinte o más entradas no debe convertirse en un
// desplazamiento interminable, ni sentirse como una pantalla distinta cada
// vez que se abre una. Sin eliminar: nucleo §9.4 no lo lista.
export function TarjetaEntradaBitacora({
  entrada,
  puedeEditar,
  guardando,
  error,
  onGuardar,
  idMiMembresia,
  puedeComentar,
  expandidaInicial = false,
}: TarjetaEntradaBitacoraProps) {
  const [expandida, setExpandida] = useState(expandidaInicial)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(entrada.contenido)
  const encabezadoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (expandidaInicial) encabezadoRef.current?.scrollIntoView({ block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function manejarGuardar(evento: FormEvent) {
    evento.preventDefault()
    await onGuardar(borrador)
    setEditando(false)
  }

  return (
    <Card className={styles.tarjeta}>
      <button
        ref={encabezadoRef}
        type="button"
        className={styles.encabezado}
        onClick={() => setExpandida((previo) => !previo)}
        aria-expanded={expandida}
      >
        <span className={styles.contenidoPreview}>{entrada.contenido}</span>
        <span className={styles.autoria}>{formatearFechaHora(entrada.fechaActualizacion)}</span>
        <IconoChevron className={styles.chevron} />
      </button>

      {expandida ? (
        <div className={styles.panel}>
          {editando ? (
            <form onSubmit={manejarGuardar} className={styles.formulario}>
              <Textarea
                label="Contenido"
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
                maxLength={LONGITUD_MAXIMA_CONTENIDO_BITACORA}
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
                    setBorrador(entrada.contenido)
                    setEditando(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p className={styles.contenido}>{entrada.contenido}</p>
              {puedeEditar ? (
                <div className={styles.acciones}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBorrador(entrada.contenido)
                      setEditando(true)
                    }}
                  >
                    Editar
                  </Button>
                </div>
              ) : null}
              {error ? <AvisoError mensaje={error} /> : null}
              <ComentariosDeEntrada
                idEntrada={entrada.id}
                idMiMembresia={idMiMembresia}
                puedeComentar={puedeComentar}
                puedeVerEntrada
              />
            </>
          )}
        </div>
      ) : null}
    </Card>
  )
}
