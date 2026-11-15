import { IconoCargando } from '../../components/ui'
import styles from './IndicadorCampo.module.css'

// Estado de guardado de un campo del autoguardado de la configuración:
// mientras guarda, si falla y, por un momento, al terminar bien. Sin ese
// "Guardado" no había forma de saber que el cambio ya estaba hecho, porque
// en Planificar no hay botón de guardar.
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
  // Se desvanece solo (animación CSS, sin temporizador): queda en el DOM
  // pero invisible, y el lector de pantalla lo anuncia una vez.
  return (
    <span className={`${styles.indicador} ${styles.indicadorGuardado}`} role="status">
      ✓ Guardado
    </span>
  )
}
