import { Link } from 'react-router-dom'
import { Badge, Card } from '../../components/ui'
import { infoFase } from './fase'
import type { Actividad } from './tipos'
import styles from './TarjetaActividad.module.css'

const PARTICIPANTES_FORMATO = new Intl.NumberFormat('es-MX')

export interface TarjetaActividadProps {
  actividad: Actividad
}

export function TarjetaActividad({ actividad }: TarjetaActividadProps) {
  const fase = infoFase(actividad.fase)

  return (
    <Link to={`/actividades/${actividad.id}`} className={styles.enlace}>
      <Card className={styles.tarjeta}>
        <div className={styles.encabezado}>
          <h3 className={styles.nombre}>{actividad.nombre}</h3>
          <Badge variant={fase.variant}>{fase.etiqueta}</Badge>
        </div>

        <p className={styles.objetivo}>{actividad.objetivo}</p>

        <div className={styles.pie}>
          {actividad.rol === 'co-organizador' ? (
            <span className={styles.rol}>Co-organizas</span>
          ) : null}
          <span className={styles.meta}>
            {PARTICIPANTES_FORMATO.format(actividad.numParticipantes)} participantes
          </span>
          <span className={styles.meta}>{actividad.fechaClave}</span>
        </div>
      </Card>
    </Link>
  )
}
