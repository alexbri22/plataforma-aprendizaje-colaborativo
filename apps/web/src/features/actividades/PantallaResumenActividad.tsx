import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Card, IconoCargando } from '../../components/ui'
import { useRitual } from '../insignias/useReconocimientos'
import { primeraSeccionHabilitada } from './espacioEquipo'
import { EtapasActividad } from './EtapasActividad'
import { formatearFecha, sumarDias } from './formato'
import { useActividad } from './useActividades'
import type { Actividad } from './tipos'
import styles from './PantallaResumenActividad.module.css'

const TITULO = 'Datos de la actividad'

// Abrir una actividad (/actividades/:id) lleva a la pantalla de su etapa en
// curso; en Creación y ya archivada, a sus datos (null).
function pantallaDeEtapa(actividad: Actividad, ritualAbierto: boolean): string | null {
  const reconocer = `/actividades/${actividad.id}/reconocer`
  if (actividad.rol !== 'participante') {
    if (actividad.fase === 'desarrollo') return `/actividades/${actividad.id}/operacion`
    if (actividad.fase === 'cierre') {
      return ritualAbierto ? reconocer : `/actividades/${actividad.id}/cierre`
    }
    return null
  }
  if (actividad.fase === 'desarrollo' && actividad.idMiEquipo) {
    const seccion = primeraSeccionHabilitada(actividad)
    return seccion ? `/equipos/${actividad.idMiEquipo}/${seccion}` : null
  }
  if (actividad.fase === 'cierre' && ritualAbierto) return reconocer
  return null
}

export interface PantallaResumenActividadProps {
  /** /actividades/:id/resumen (Datos de la actividad, desde la barra
   * lateral): se queda aquí siempre, sin llevar a la pantalla de la etapa. */
  soloResumen?: boolean
}

export function PantallaResumenActividad({ soloResumen = false }: PantallaResumenActividadProps) {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  // Solo para decidir a dónde lleva abrir la actividad en Cierre.
  const enCierre = actividadQuery.data?.fase === 'cierre'
  const ritualQuery = useRitual(id, { enabled: !soloResumen && enCierre })
  const contexto = { idActividad: id, seccion: 'resumen' } as const

  if (actividadQuery.isPending || (!soloResumen && enCierre && ritualQuery.isPending)) {
    return (
      <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contexto}>
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

  const destino = soloResumen
    ? null
    : pantallaDeEtapa(actividad, Boolean(ritualQuery.data?.contexto.abierto))
  if (destino) return <Navigate to={destino} replace />

  return (
    <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contexto} ayuda="resumen">
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
                  {actividad.fase === 'configuracion' || actividad.fase === 'inscripcion'
                    ? 'Hasta el'
                    : 'Cerró el'}{' '}
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
