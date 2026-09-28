import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Card, IconoCargando } from '../../components/ui'
import { useActividad, useParticipantes } from '../actividades'
import styles from './PantallaParticipantes.module.css'

/**
 * Los participantes de la actividad. Cada nombre lleva a su perfil básico;
 * para quien organiza, además, a lo que recibió. La API ya rechaza a un participante que intente abrir el
 * detalle de otro; aquí solo se oculta el enlace por conveniencia de interfaz,
 * nunca como barrera (docs/diseno-desarrollo-general.md §7.4).
 */
export function PantallaParticipantes() {
  const { id = '' } = useParams<{ id: string }>()
  const actividad = useActividad(id)
  const participantes = useParticipantes(id)

  if (actividad.isPending || participantes.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Participantes">
        <div className={styles.cargando} role="status" aria-label="Cargando participantes">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividad.isError || participantes.isError || !actividad.data || !participantes.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Participantes">
        <AvisoError mensaje="No encontramos esta actividad, o ya no formas parte de ella." />
      </AppShell>
    )
  }

  const organiza = actividad.data.rol !== 'participante'

  return (
    <AppShell seccionActiva="actividades" titulo={`Participantes de ${actividad.data.nombre}`}>
      <Card>
        {participantes.data.length === 0 ? (
          <p className={styles.texto}>Todavía nadie se ha unido a esta actividad.</p>
        ) : (
          <ul className={styles.lista}>
            {participantes.data.map((p) => (
              <li key={p.idMembresia} className={styles.participante}>
                <Link to={`/usuarios/${p.idUsuario}`} className={styles.nombre}>
                  {p.nombre}
                </Link>
                {organiza ? (
                  <Link
                    to={`/actividades/${id}/participantes/${p.idMembresia}`}
                    className={styles.enlace}
                  >
                    Ver reconocimientos
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  )
}
