import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Card, IconoCargando } from '../../components/ui'
import { primeraSeccionHabilitada } from './espacioEquipo'
import { EtapasActividad } from './EtapasActividad'
import { formatearFecha, sumarDias } from './formato'
import { useActividad } from './useActividades'
import styles from './PantallaResumenActividad.module.css'

// Fases en que quien participa ya trabaja con su equipo: abrir la actividad
// lo lleva directo ahí en vez de hacerle buscar su equipo entre los demás.
const FASES_DE_TRABAJO_EN_EQUIPO = ['desarrollo', 'cierre']

export interface PantallaResumenActividadProps {
  /** /actividades/:id/resumen (Resumen, desde la barra lateral): se queda aquí
   * siempre, sin llevar al espacio del equipo. */
  soloResumen?: boolean
}

export function PantallaResumenActividad({ soloResumen = false }: PantallaResumenActividadProps) {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const contexto = { idActividad: id, seccion: 'resumen' } as const

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Resumen" contexto={contexto}>
        <div className={styles.cargando} role="status" aria-label="Cargando la actividad">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad no encontrada">
        <p className={styles.texto}>No encontramos esta actividad, o ya no formas parte de ella.</p>
      </AppShell>
    )
  }

  const actividad = actividadQuery.data

  if (
    !soloResumen &&
    actividad.rol === 'participante' &&
    actividad.idMiEquipo &&
    FASES_DE_TRABAJO_EN_EQUIPO.includes(actividad.fase)
  ) {
    const seccion = primeraSeccionHabilitada(actividad)
    if (seccion) return <Navigate to={`/equipos/${actividad.idMiEquipo}/${seccion}`} replace />
  }

  return (
    <AppShell seccionActiva="actividades" titulo="Resumen" contexto={contexto} ayuda="resumen">
      <div className={styles.contenido}>
        <EtapasActividad actividad={actividad} />

        <Card className={styles.seccionCard}>
          <h2 className={styles.nombreActividad}>{actividad.nombre}</h2>

          <div className={styles.detalle}>
            <span className={styles.detalleEtiqueta}>Objetivo</span>
            <p className={styles.objetivo}>{actividad.objetivo}</p>
          </div>

          {actividad.informacionGeneral ? (
            <div className={styles.detalle}>
              <span className={styles.detalleEtiqueta}>Información general</span>
              <p className={styles.texto}>{actividad.informacionGeneral}</p>
            </div>
          ) : null}
        </Card>

        <Card className={styles.seccionCard}>
          <h2 className={styles.tituloSeccion}>Detalles</h2>
          <dl className={styles.detalles}>
            {actividad.nombreOrganizador ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Organiza</dt>
                <dd className={styles.detalleValor}>{actividad.nombreOrganizador}</dd>
              </div>
            ) : null}
            {/* Cada valor dice para qué sirve o qué pasa entonces, en vez
                de un dato suelto ("10 días") que hay que interpretar. */}
            {/* Solo el número: la lista está en Participantes. Es lo que dice si
                ya es momento de cerrar la inscripción. */}
            <div className={styles.detalle}>
              <dt className={styles.detalleEtiqueta}>Participantes</dt>
              <dd className={styles.detalleValor}>
                {actividad.numParticipantes === 0
                  ? 'Nadie se ha unido todavía'
                  : actividad.numParticipantes === 1
                    ? '1 se ha unido'
                    : `${actividad.numParticipantes} se han unido`}
              </dd>
            </div>
            <div className={styles.detalle}>
              <dt className={styles.detalleEtiqueta}>Clave de ingreso</dt>
              <dd className={styles.detalleValor}>
                <span className={styles.clave}>{actividad.claveIngreso ?? '—'}</span>
                {actividad.claveIngreso && actividad.fase === 'inscripcion' ? (
                  <span className={styles.detalleNota}>Compártela para que se unan.</span>
                ) : null}
              </dd>
            </div>
            {actividad.fechaInicio && actividad.fechaTermino ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Fechas</dt>
                <dd className={styles.detalleValor}>
                  {formatearFecha(actividad.fechaInicio)} – {formatearFecha(actividad.fechaTermino)}
                </dd>
              </div>
            ) : null}
            {actividad.fechaLimiteInscripcion ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Inscripción</dt>
                <dd className={styles.detalleValor}>
                  {actividad.fase === 'inscripcion' ? 'Hasta el' : 'Cerró el'}{' '}
                  {formatearFecha(actividad.fechaLimiteInscripcion)}
                </dd>
              </div>
            ) : null}
            {actividad.fechaTermino && actividad.plazoCierreDias != null ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Reconocimientos</dt>
                <dd className={styles.detalleValor}>
                  Del {formatearFecha(actividad.fechaTermino)} al{' '}
                  {formatearFecha(sumarDias(actividad.fechaTermino, actividad.plazoCierreDias))}
                </dd>
              </div>
            ) : null}
            {actividad.numeroEquiposEsperado != null ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Equipos esperados</dt>
                <dd className={styles.detalleValor}>{actividad.numeroEquiposEsperado}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>
    </AppShell>
  )
}
