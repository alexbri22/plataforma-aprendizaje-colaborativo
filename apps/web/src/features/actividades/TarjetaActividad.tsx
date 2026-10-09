import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import type { Actividad } from './tipos'
import styles from './TarjetaActividad.module.css'

const PARTICIPANTES_FORMATO = new Intl.NumberFormat('es-MX')

export interface TarjetaActividadProps {
  actividad: Actividad
}

// El estado (antes una píldora sobre el título) se quitó de la tarjeta a
// pedido de producto; vuelve en otra forma, todavía por definir.
export function TarjetaActividad({ actividad }: TarjetaActividadProps) {
  return (
    <Link to={`/actividades/${actividad.id}`} className={styles.enlace}>
      <Card className={styles.tarjeta}>
        <h3 className={styles.nombre}>{actividad.nombre}</h3>
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
