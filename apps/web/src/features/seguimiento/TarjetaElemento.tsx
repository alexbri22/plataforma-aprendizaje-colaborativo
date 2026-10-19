import {
  LONGITUD_MAXIMA_CONTENIDO_ELEMENTO,
  type ElementoDeEspacioEquipo,
} from '@plataforma/shared'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatearFechaHora } from '../actividades'
import { AvisoError, Button, Card, IconoCargando, Textarea } from '../../components/ui'
import { ComentariosDeElemento } from './ComentariosDeElemento'
import { IconoChevron } from './IconoChevron'
import styles from './TarjetaElemento.module.css'

interface TarjetaElementoProps {
  elemento: ElementoDeEspacioEquipo
  /** Cualquier integrante puede editar o eliminar cualquier elemento, no
   * solo el que creó (nucleo §9.1): una sola bandera basta. */
  puedeEscribir: boolean
  guardando: boolean
  eliminando: boolean
  error: string | null
  onGuardar: (contenido: string) => Promise<void>
  onEliminar: () => void
  idMiMembresia: string | undefined
  /** Organizador o co-organizador con `calificar_y_comentar` (nucleo §10.4). */
  puedeComentar: boolean
  /** Llega ya expandida y con scroll hacia ella (clic en un evento del
   * historial, PanelHistorial): "ir directamente a revisarlo" de verdad,
   * no solo a la sección donde vive — entre veinte tarjetas colapsadas,
   * encontrar la que cambió era el problema que esto resuelve. */
  expandidaInicial?: boolean
}

// Una meta, un avance o un recurso. El encabezado (vista previa, autoría,
// flecha) es idéntico colapsado o expandido — mismo criterio que GrupoNav
// en el sidebar: la estructura que ya se ve no cambia, expandir solo
// revela un panel debajo con lo que estaba escondido (contenido completo,
// acciones, comentarios). El panel no se monta mientras está colapsado: una
// lista de veinte tarjetas no dispara veinte consultas de comentarios de
// una vez (ComentariosDeElemento solo se monta al expandir). El modo de
// edición es local a la tarjeta: abrir una no cierra las demás.
export function TarjetaElemento({
  elemento,
  puedeEscribir,
  guardando,
  eliminando,
  error,
  onGuardar,
  onEliminar,
  idMiMembresia,
  puedeComentar,
  expandidaInicial = false,
}: TarjetaElementoProps) {
  const [expandida, setExpandida] = useState(expandidaInicial)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(elemento.contenido)
  const encabezadoRef = useRef<HTMLButtonElement>(null)

  // Solo al montar: expandidaInicial refleja el id pedido por la URL en ese
  // momento, no algo que deba reabrirse después si la persona la colapsa a
  // propósito.
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
        <span className={styles.contenidoPreview}>{elemento.contenido}</span>
        <span className={styles.autoria}>
          {elemento.autor} · {formatearFechaHora(elemento.fechaActualizacion)}
        </span>
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
                maxLength={LONGITUD_MAXIMA_CONTENIDO_ELEMENTO}
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
                    setBorrador(elemento.contenido)
                    setEditando(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p className={styles.contenido}>{elemento.contenido}</p>
              {puedeEscribir ? (
                <div className={styles.acciones}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // borrador se inicializó con useState(elemento.contenido),
                      // que React solo evalúa al montar: si el contenido
                      // cambió desde entonces por un refetch (lo editó alguien
                      // más), reiniciarlo aquí evita abrir la edición sobre un
                      // valor ya obsoleto y terminar guardándolo encima del
                      // más nuevo.
                      setBorrador(elemento.contenido)
                      setEditando(true)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={eliminando}
                    onClick={onEliminar}
                  >
                    {eliminando ? <IconoCargando size={14} /> : 'Eliminar'}
                  </Button>
                </div>
              ) : null}
              {error ? <AvisoError mensaje={error} /> : null}
              <ComentariosDeElemento
                idElemento={elemento.id}
                idMiMembresia={idMiMembresia}
                puedeComentar={puedeComentar}
              />
            </>
          )}
        </div>
      ) : null}
    </Card>
  )
}
