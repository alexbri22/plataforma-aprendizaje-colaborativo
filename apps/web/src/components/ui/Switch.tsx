import { useId, type InputHTMLAttributes } from 'react'
import styles from './Switch.module.css'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  ocultarEtiqueta?: boolean
}

export function Switch({ label, id, className, ocultarEtiqueta, ...props }: SwitchProps) {
  const generatedId = useId()
  const switchId = id ?? generatedId

  return (
    <label className={styles.contenedor} htmlFor={switchId}>
      <input
        type="checkbox"
        role="switch"
        id={switchId}
        className={[styles.input, className].filter(Boolean).join(' ')}
        {...props}
      />
      <span className={[styles.etiqueta, ocultarEtiqueta ? styles.etiquetaOculta : null]
        .filter(Boolean)
        .join(' ')}
      >
        {label}
      </span>
    </label>
  )
}
