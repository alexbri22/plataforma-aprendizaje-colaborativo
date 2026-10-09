import {
  LONGITUD_MAXIMA_NOMBRE_EQUIPO,
  LONGITUD_MAXIMA_TEXTO_EQUIPO,
  type Equipo,
  type ParticipanteSinEquipo,
  type RolIntegrante,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import {
  AvisoError,
  Badge,
  Button,
  IconoCargando,
  Input,
  PanelLateral,
  Select,
  Textarea,
} from '../../components/ui'
import styles from './PanelEditarEquipo.module.css'
import type { CambiosEquipo } from './equipos.api'

const ETIQUETA_ROL: Record<RolIntegrante, string | null> = {
  organizador: 'Organiza',
  'co-organizador': 'Co-organiza',
  participante: null,
}

interface PanelEditarEquipoProps {
  /** El equipo tal como está ahora, no una copia: los cambios de integrantes
   * se reflejan en el panel al instante. Nulo cierra el panel. */
  equipo: Equipo | null
  sinEquipo: ParticipanteSinEquipo[]
  /** Qué puede hacer quien lo abre (capacidades del servidor). */
  puedeEditar: boolean
  puedeAsignar: boolean
  puedeEliminar: boolean
  /** Durante la formación un participante puede quedar sin equipo; después no. */
  enFormacion: boolean
  ocupado: boolean
  error: string | null
  onCerrar: () => void
  onGuardar: (idEquipo: string, cambios: CambiosEquipo) => Promise<void>
  onAsignar: (idEquipo: string, idMembresia: string) => void
  onRetirar: (idEquipo: string, idMembresia: string) => void
  onEliminar: (idEquipo: string) => void
}

function DatosDelEquipo({
  equipo,
  onGuardar,
}: {
  equipo: Equipo
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className={styles.seccion} onSubmit={enviar} noValidate>
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
      <Button type="submit" className={styles.guardar} disabled={guardando || nombreVacio}>
        {guardando ? (
          <>
            <IconoCargando />
            Guardando…
          </>
        ) : (
          'Guardar'
        )}
      </Button>
    </form>
  )
}

// Todo lo que se hace con un equipo, en un solo lugar: sus datos, sus
// integrantes y eliminarlo. Cada sección aparece solo si el servidor concede
// la acción que la sostiene. Datos e integrantes son secundarios de una fila
// de la vista de equipos, así que van en el panel lateral (DESIGN.md, "Side
// Panel"). Los datos se guardan con el botón; agregar y quitar integrantes
// surte efecto al instante, como en la asignación.
export function PanelEditarEquipo({
  equipo,
  sinEquipo,
  puedeEditar,
  puedeAsignar,
  puedeEliminar,
  enFormacion,
  ocupado,
  error,
  onCerrar,
  onGuardar,
  onAsignar,
  onRetirar,
  onEliminar,
}: PanelEditarEquipoProps) {
  const [confirmando, setConfirmando] = useState(false)

  function cerrar() {
    setConfirmando(false)
    onCerrar()
  }

  return (
    <PanelLateral abierto={equipo !== null} titulo={equipo?.nombre ?? 'Equipo'} onCerrar={cerrar}>
      {equipo ? (
        <div className={styles.contenido}>
          {error ? <AvisoError mensaje={error} /> : null}

          {puedeEditar ? (
            <DatosDelEquipo key={equipo.id} equipo={equipo} onGuardar={onGuardar} />
          ) : null}

          {puedeAsignar ? (
            <section className={styles.seccion} aria-labelledby="integrantes-del-equipo">
              <h3 id="integrantes-del-equipo" className={styles.titulo}>
                Integrantes ({equipo.integrantes.length})
              </h3>
              {equipo.integrantes.length > 0 ? (
                <ul className={styles.lista}>
                  {equipo.integrantes.map((integrante) => (
                    <li key={integrante.idMembresia} className={styles.fila}>
                      <span className={styles.nombre}>
                        {integrante.nombre}
                        {ETIQUETA_ROL[integrante.rol] ? (
                          <Badge variant="neutral">{ETIQUETA_ROL[integrante.rol]}</Badge>
                        ) : null}
                      </span>
                      {enFormacion || integrante.rol !== 'participante' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={ocupado}
                          aria-label={`Quitar a ${integrante.nombre}`}
                          onClick={() => onRetirar(equipo.id, integrante.idMembresia)}
                        >
                          Quitar
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {sinEquipo.length > 0 ? (
                <Select
                  label="Agregar persona"
                  value=""
                  disabled={ocupado}
                  onChange={(e) => {
                    if (e.target.value) onAsignar(equipo.id, e.target.value)
                  }}
                >
                  <option value="">Elegir…</option>
                  {sinEquipo.map((persona) => (
                    <option key={persona.idMembresia} value={persona.idMembresia}>
                      {persona.nombre}
                    </option>
                  ))}
                </Select>
              ) : null}
            </section>
          ) : null}

          {puedeEliminar ? (
            <section className={styles.seccion}>
              {confirmando ? (
                <>
                  <p className={styles.texto}>Sus integrantes quedan sin equipo.</p>
                  <div className={styles.botones}>
                    <Button
                      variant="danger"
                      disabled={ocupado}
                      onClick={() => onEliminar(equipo.id)}
                    >
                      Eliminar equipo
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={ocupado}
                      onClick={() => setConfirmando(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  variant="secondary"
                  className={styles.guardar}
                  onClick={() => setConfirmando(true)}
                >
                  Eliminar equipo
                </Button>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
    </PanelLateral>
  )
}
