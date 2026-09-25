import {
  LONGITUD_MAXIMA_NOMBRE_EQUIPO,
  LONGITUD_MAXIMA_TEXTO_EQUIPO,
  type Equipo,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import {
  AvisoError,
  Button,
  IconoCargando,
  Input,
  PanelLateral,
  Textarea,
} from '../../components/ui'
import styles from './PanelEditarEquipo.module.css'
import type { CambiosEquipo } from './equipos.api'

interface PanelEditarEquipoProps {
  equipo: Equipo | null
  onCerrar: () => void
  onGuardar: (idEquipo: string, cambios: CambiosEquipo) => Promise<void>
}

// Los tres campos que el propio equipo llena (general §5.2). Va en el panel
// lateral porque son valores secundarios de una fila de la vista de equipos
// (DESIGN.md, "Side Panel"). El formulario se monta de nuevo por equipo, así
// que sus valores iniciales siempre son los del equipo abierto.
function FormularioEquipo({
  equipo,
  onCerrar,
  onGuardar,
}: {
  equipo: Equipo
  onCerrar: () => void
  onGuardar: PanelEditarEquipoProps['onGuardar']
}) {
  const [nombre, setNombre] = useState(equipo.nombre)
  const [descripcion, setDescripcion] = useState(equipo.descripcionActividad ?? '')
  const [forma, setForma] = useState(equipo.formaDeTrabajo ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const nombreVacio = nombre.trim() === ''

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (nombreVacio) return
    setError(null)
    setGuardando(true)
    try {
      await onGuardar(equipo.id, {
        nombre: nombre.trim(),
        descripcionActividad: descripcion.trim() === '' ? null : descripcion.trim(),
        formaDeTrabajo: forma.trim() === '' ? null : forma.trim(),
      })
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {error ? <AvisoError mensaje={error} /> : null}
      <Input
        label="Nombre del equipo"
        value={nombre}
        maxLength={LONGITUD_MAXIMA_NOMBRE_EQUIPO}
        error={nombreVacio ? 'Escribe un nombre para el equipo.' : undefined}
        onChange={(e) => setNombre(e.target.value)}
      />
      <Textarea
        label="Qué va a hacer el equipo"
        value={descripcion}
        maxLength={LONGITUD_MAXIMA_TEXTO_EQUIPO}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      <Textarea
        label="Cómo van a trabajar"
        value={forma}
        maxLength={LONGITUD_MAXIMA_TEXTO_EQUIPO}
        onChange={(e) => setForma(e.target.value)}
      />
      <div className={styles.botones}>
        <Button type="submit" disabled={guardando || nombreVacio}>
          {guardando ? (
            <>
              <IconoCargando />
              Guardando…
            </>
          ) : (
            'Guardar'
          )}
        </Button>
        <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export function PanelEditarEquipo({ equipo, onCerrar, onGuardar }: PanelEditarEquipoProps) {
  return (
    <PanelLateral abierto={equipo !== null} titulo="Editar equipo" onCerrar={onCerrar}>
      {equipo ? (
        <FormularioEquipo
          key={equipo.id}
          equipo={equipo}
          onCerrar={onCerrar}
          onGuardar={onGuardar}
        />
      ) : null}
    </PanelLateral>
  )
}
