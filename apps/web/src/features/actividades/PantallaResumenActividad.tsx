import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Badge, Card, IconoCargando } from '../../components/ui'
import { infoFase } from './fase'
import { formatearFecha } from './formato'
import { useActividad } from './useActividades'
import styles from './PantallaResumenActividad.module.css'

export function PantallaResumenActividad() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad">
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
  const fase = infoFase(actividad.fase)

  return (
    <AppShell seccionActiva="actividades" titulo={actividad.nombre}>
      <Card className={styles.card}>
        <Badge variant={fase.variant} className={styles.badge}>
          {fase.etiqueta}
        </Badge>

        <p className={styles.objetivo}>{actividad.objetivo}</p>

        {actividad.informacionGeneral ? (
          <div className={styles.seccion}>
            <h2 className={styles.tituloSeccion}>Información general</h2>
            <p className={styles.texto}>{actividad.informacionGeneral}</p>
          </div>
        ) : null}

        <dl className={styles.detalles}>
          <div className={styles.detalle}>
            <dt className={styles.detalleEtiqueta}>Clave de ingreso</dt>
            <dd className={`${styles.detalleValor} ${styles.clave}`}>
              {actividad.claveIngreso ?? '—'}
            </dd>
          </div>
          {actividad.fechaInicio && actividad.fechaTermino ? (
            <div className={styles.detalle}>
              <dt className={styles.detalleEtiqueta}>Periodo</dt>
              <dd className={styles.detalleValor}>
                {formatearFecha(actividad.fechaInicio)} – {formatearFecha(actividad.fechaTermino)}
              </dd>
            </div>
          ) : null}
          {actividad.fechaLimiteInscripcion ? (
            <div className={styles.detalle}>
              <dt className={styles.detalleEtiqueta}>Fecha límite de inscripción</dt>
              <dd className={styles.detalleValor}>
                {formatearFecha(actividad.fechaLimiteInscripcion)}
              </dd>
            </div>
          ) : null}
          {actividad.plazoCierreDias != null ? (
            <div className={styles.detalle}>
              <dt className={styles.detalleEtiqueta}>Plazo de cierre</dt>
              <dd className={styles.detalleValor}>{actividad.plazoCierreDias} días</dd>
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
    </AppShell>
  )
}
