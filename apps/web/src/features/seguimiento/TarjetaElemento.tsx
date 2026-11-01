import {
  LONGITUD_MAXIMA_CONTENIDO_ELEMENTO,
  esUrlSegura,
  type ElementoDeEspacioEquipo,
} from '@plataforma/shared'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatearFechaHora } from '../actividades'
import { AvisoError, Button, Card, IconoCargando, Textarea } from '../../components/ui'
import { AdjuntosElemento, CamposAdjuntos, MarcaAdjunto } from './AdjuntosElemento'
import { ComentariosDeElemento } from './ComentariosDeElemento'
import { IconoChevron } from './IconoChevron'
import type { DatosElemento } from './useElementos'
import styles from './TarjetaElemento.module.css'

interface TarjetaElementoProps {
  elemento: ElementoDeEspacioEquipo
  /** Cualquier integrante puede editar o eliminar cualquier elemento, no
   * solo el que creó (nucleo §9.1): una sola bandera basta. */
  puedeEscribir: boolean
  guardando: boolean
  eliminando: boolean
  error: string | null
  onGuardar: (datos: DatosElemento) => Promise<void>
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
  const [enlace, setEnlace] = useState(elemento.enlace ?? '')
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null)
  const [quitarArchivo, setQuitarArchivo] = useState(false)
  const [errorEnlace, setErrorEnlace] = useState<string | undefined>()
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const encabezadoRef = useRef<HTMLButtonElement>(null)

  // Solo al montar: expandidaInicial refleja el id pedido por la URL en ese
  // momento, no algo que deba reabrirse después si la persona la colapsa a
  // propósito.
  useEffect(() => {
    if (expandidaInicial) encabezadoRef.current?.scrollIntoView({ block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Abre la edición con lo que hay ahora (pudo cambiar por un refetch).
  function empezarEdicion() {
    setBorrador(elemento.contenido)
    setEnlace(elemento.enlace ?? '')
    setArchivoNuevo(null)
    setQuitarArchivo(false)
    setErrorEnlace(undefined)
    setEditando(true)
  }

  async function manejarGuardar(evento: FormEvent) {
    evento.preventDefault()
    const enlaceLimpio = enlace.trim()
    if (enlaceLimpio && !esUrlSegura(enlaceLimpio)) {
      setErrorEnlace('Debe ser un enlace completo que empiece con https://')
      return
    }
    await onGuardar({
      contenido: borrador,
      enlace: enlaceLimpio || null,
      archivo: archivoNuevo ?? (quitarArchivo ? null : undefined),
    })
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
        {elemento.enlace || elemento.archivo ? <MarcaAdjunto /> : null}
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
              <CamposAdjuntos
                enlace={enlace}
                onEnlace={setEnlace}
                archivoNuevo={archivoNuevo}
                onArchivoNuevo={setArchivoNuevo}
                archivoActual={elemento.archivo}
                quitarActual={quitarArchivo}
                onQuitarActual={setQuitarArchivo}
                errorEnlace={errorEnlace}
                disabled={guardando}
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
              <AdjuntosElemento
                idElemento={elemento.id}
                enlace={elemento.enlace}
                archivo={elemento.archivo}
              />
              {puedeEscribir && confirmandoEliminar ? (
                // Eliminar no tiene vuelta atrás y es del equipo entero (lo
                // borra para todos): se confirma en el mismo lugar, con el
                // patrón "Sí, {verbo}" + Cancelar del resto de la app.
                <div
                  className={styles.confirmacion}
                  role="group"
                  aria-label="Confirmar eliminación"
                >
                  <span className={styles.pregunta}>¿Eliminar esto para todo el equipo?</span>
                  <div className={styles.acciones}>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={eliminando}
                      onClick={onEliminar}
                    >
                      {eliminando ? <IconoCargando size={14} /> : 'Sí, eliminar'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={eliminando}
                      onClick={() => setConfirmandoEliminar(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : puedeEscribir ? (
                <div className={styles.acciones}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    // Reinicia el borrador al abrir: useState solo toma el
                    // valor al montar, y si alguien más lo editó desde
                    // entonces se guardaría encima del más nuevo.
                    onClick={empezarEdicion}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmandoEliminar(true)}
                  >
                    Eliminar
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
