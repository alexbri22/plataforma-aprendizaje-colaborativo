import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Input.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Una línea bajo la etiqueta que dice para qué se usa el dato (no lo
   * define). Siempre visible: no se esconde en un placeholder ni en un
   * tooltip, porque se necesita para llenar el campo. */
  ayuda?: string
  error?: string
  endAdornment?: ReactNode
}

export function Input({ label, ayuda, error, id, className, endAdornment, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      {ayuda ? (
        <span id={`${inputId}-ayuda`} className={styles.ayuda}>
          {ayuda}
        </span>
      ) : null}
      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          className={[
            styles.input,
            endAdornment ? styles.hasAdornment : null,
            error ? styles.error : null,
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [ayuda ? `${inputId}-ayuda` : null, error ? `${inputId}-error` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          {...props}
        />
        {endAdornment ? <span className={styles.adornment}>{endAdornment}</span> : null}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className={styles.errorMessage}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
