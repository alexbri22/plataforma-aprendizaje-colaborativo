import {
  primeraRespuestaBitacora,
  validarRespuestasBitacora,
  type EntradaBitacora,
  type RespuestasBitacora,
} from '@plataforma/shared'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatearFechaHora } from '../actividades'
import { AvisoError, Button, Card, IconoCargando } from '../../components/ui'
import { CamposBitacora, RespuestasDeBitacora } from './CamposBitacora'
import { ComentariosDeEntrada } from './ComentariosDeEntrada'
import { IconoChevron } from './IconoChevron'
import styles from './TarjetaElemento.module.css'

interface TarjetaEntradaBitacoraProps {
  entrada: EntradaBitacora
  /** Solo el autor edita una entrada propia (nucleo §9.4). */
  puedeEditar: boolean
  guardando: boolean
  error: string | null
  onGuardar: (respuestas: RespuestasBitacora) => Promise<void>
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
  const [borrador, setBorrador] = useState<RespuestasBitacora>(entrada.respuestas)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const encabezadoRef = useRef<HTMLButtonElement>(null)

  // expandidaInicial refleja el id pedido por la URL. La tarjeta puede ya
  // estar montada cuando cambia (enlace del historial a una entrada de la
  // página actual), así que se reacciona al cambio y no solo al montar;
  // ajuste durante el render, como en PantallaMiBitacora. Solo al pasar a
  // true: si la persona la colapsa después, no se reabre sola.
  const [expandidaInicialPrevia, setExpandidaInicialPrevia] = useState(expandidaInicial)
  if (expandidaInicial !== expandidaInicialPrevia) {
    setExpandidaInicialPrevia(expandidaInicial)
    if (expandidaInicial) setExpandida(true)
  }
  useEffect(() => {
    if (expandidaInicial) encabezadoRef.current?.scrollIntoView({ block: 'center' })
  }, [expandidaInicial])

  function empezarEdicion() {
    setBorrador(entrada.respuestas)
    setErrores({})
    setEditando(true)
  }

  async function manejarGuardar(evento: FormEvent) {
    evento.preventDefault()
    const validacion = validarRespuestasBitacora(borrador)
    if ('errores' in validacion) {
      setErrores(validacion.errores)
      return
    }
    await onGuardar(validacion.respuestas)
    setEditando(false)
  }

  const sinRespuestas = !Object.values(borrador).some((texto) => texto?.trim())

  return (
    <Card className={styles.tarjeta}>
      <button
        ref={encabezadoRef}
        type="button"
        className={styles.encabezado}
        onClick={() => setExpandida((previo) => !previo)}
        aria-expanded={expandida}
      >
        <span className={styles.contenidoPreview}>
          {primeraRespuestaBitacora(entrada.respuestas)}
        </span>
        <span className={styles.autoria}>{formatearFechaHora(entrada.fechaActualizacion)}</span>
        <IconoChevron className={styles.chevron} />
      </button>

      {expandida ? (
        <div className={styles.panel}>
          {editando ? (
            <form onSubmit={manejarGuardar} className={styles.formulario}>
              <CamposBitacora
                respuestas={borrador}
                errores={errores}
                onCambiar={(clave, texto) =>
                  setBorrador((previas) => ({ ...previas, [clave]: texto }))
                }
              />
              {error ? <AvisoError mensaje={error} /> : null}
              {errores.respuestas ? <AvisoError mensaje={errores.respuestas} /> : null}
              <div className={styles.acciones}>
                <Button type="submit" size="sm" disabled={guardando || sinRespuestas}>
                  {guardando ? <IconoCargando size={14} /> : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={guardando}
                  onClick={() => setEditando(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <>
              <RespuestasDeBitacora respuestas={entrada.respuestas} />
              {puedeEditar ? (
                <div className={styles.acciones}>
                  <Button type="button" variant="ghost" size="sm" onClick={empezarEdicion}>
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
