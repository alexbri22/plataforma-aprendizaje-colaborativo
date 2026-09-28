import { IconoCargando } from '../../components/ui'
import styles from './IndicadorCampo.module.css'

// Estado de guardado de un campo del autoguardado de la configuración. Solo
// se pinta mientras guarda y si falla: al terminar bien, el propio control ya
// muestra el valor nuevo y una etiqueta "Guardado" solo sumaba ruido.
export interface EstadoCampo {
  status: 'guardando' | 'guardado' | 'error'
  mensaje?: string
}

export const MENSAJE_ERROR_GUARDADO = 'No pudimos guardar este cambio. Intenta de nuevo.'

export function IndicadorCampo({ estado }: { estado?: EstadoCampo }) {
  if (!estado) return null
  if (estado.status === 'guardando') {
    return (
      <span className={styles.indicador}>
        <IconoCargando size={14} /> Guardando…
      </span>
    )
  }
  if (estado.status === 'error') {
    return (
      <span className={`${styles.indicador} ${styles.indicadorError}`} role="alert">
        {estado.mensaje}
      </span>
    )
  }
  return null
}
