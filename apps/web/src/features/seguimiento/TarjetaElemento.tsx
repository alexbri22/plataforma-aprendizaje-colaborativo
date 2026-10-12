import {
  LONGITUD_MAXIMA_CONTENIDO_ELEMENTO,
  type ElementoDeEspacioEquipo,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { formatearFechaHora } from '../actividades'
import { AvisoError, Button, Card, IconoCargando, Textarea } from '../../components/ui'
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
}

// Una meta, un avance o un recurso, con su autor y la acción de editar o
// eliminar. El modo de edición es local a la tarjeta: abrir una no cierra
// las demás, porque dos integrantes pueden estar redactando a la vez.
export function TarjetaElemento({
  elemento,
  puedeEscribir,
  guardando,
  eliminando,
  error,
  onGuardar,
  onEliminar,
}: TarjetaElementoProps) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(elemento.contenido)

  async function manejarGuardar(evento: FormEvent) {
    evento.preventDefault()
    await onGuardar(borrador)
    setEditando(false)
  }

  if (editando) {
    return (
      <Card className={styles.tarjeta}>
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
      </Card>
    )
  }

  return (
    <Card className={styles.tarjeta}>
      <p className={styles.contenido}>{elemento.contenido}</p>
      <div className={styles.pie}>
        <span className={styles.autoria}>
          {elemento.autor} · {formatearFechaHora(elemento.fechaActualizacion)}
        </span>
        {puedeEscribir ? (
          <div className={styles.acciones}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(true)}>
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
      </div>
      {error ? <AvisoError mensaje={error} /> : null}
    </Card>
  )
}
