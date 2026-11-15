import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Card, IconoCargando, Paginacion, rebanar } from '../../components/ui'
import { formatearFechaHora, useActividad, useParticipantes } from '../actividades'
import styles from './PantallaParticipantes.module.css'

/**
 * Los participantes de la actividad. Cada nombre lleva a su perfil básico;
 * para quien organiza, además, a lo que recibió. La API ya rechaza a un participante que intente abrir el
 * detalle de otro; aquí solo se oculta el enlace por conveniencia de interfaz,
 * nunca como barrera (docs/diseno-desarrollo-general.md §7.4).
 */
const PARTICIPANTES_POR_PAGINA = 10

export function PantallaParticipantes() {
  const { id = '' } = useParams<{ id: string }>()
  const [pagina, setPagina] = useState(0)
  const actividad = useActividad(id)
  const participantes = useParticipantes(id)

  if (actividad.isPending || participantes.isPending) {
    return (
      <AppShell
        seccionActiva="actividades"
        titulo="Participantes"
        contexto={{ idActividad: id, seccion: 'participantes' }}
      >
        <div className={styles.cargando} role="status" aria-label="Cargando participantes">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividad.isError || participantes.isError || !actividad.data || !participantes.data) {
    return (
      <AppShell
        seccionActiva="actividades"
        titulo="Participantes"
        contexto={{ idActividad: id, seccion: 'participantes' }}
      >
        <AvisoError mensaje="No encontramos esta actividad, o ya no formas parte de ella." />
      </AppShell>
    )
  }

  const organiza = actividad.data.rol !== 'participante'

  return (
    <AppShell
      seccionActiva="actividades"
      titulo="Participantes"
      contexto={{ idActividad: id, seccion: 'participantes' }}
    >
      <Card>
        {participantes.data.length === 0 ? (
          <p className={styles.texto}>Todavía nadie se ha unido a esta actividad.</p>
        ) : (
          (() => {
            const { visibles, pagina: paginaActual } = rebanar(
              participantes.data,
              pagina,
              PARTICIPANTES_POR_PAGINA,
            )
            return (
              <>
                <ul className={styles.lista}>
                  {visibles.map((p) => (
                    <li key={p.idMembresia} className={styles.participante}>
                      <span className={styles.datos}>
                        <Link to={`/usuarios/${p.idUsuario}`} className={styles.nombre}>
                          {p.nombre}
                        </Link>
                        <span className={styles.fecha}>
                          Se unió el {formatearFechaHora(p.fechaUnion)}
                        </span>
                      </span>
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
                <Paginacion
                  total={participantes.data.length}
                  tamano={PARTICIPANTES_POR_PAGINA}
                  pagina={paginaActual}
                  onCambiar={setPagina}
                  etiqueta="Participantes"
                />
              </>
            )
          })()
        )}
      </Card>
    </AppShell>
  )
}
