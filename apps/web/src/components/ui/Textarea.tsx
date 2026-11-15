import { useId, type TextareaHTMLAttributes } from 'react'
import styles from './Textarea.module.css'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  /** Una línea bajo la etiqueta que dice para qué se usa el dato (no lo
   * define). Siempre visible: no se esconde en un placeholder ni en un
   * tooltip, porque se necesita para llenar el campo. */
  ayuda?: string
  error?: string
}

export function Textarea({
  label,
  ayuda,
  error,
  id,
  className,
  rows = 3,
  ...props
}: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={textareaId}>
        {label}
      </label>
      {ayuda ? (
        <span id={`${textareaId}-ayuda`} className={styles.ayuda}>
          {ayuda}
        </span>
      ) : null}
      <textarea
        id={textareaId}
        rows={rows}
        className={[styles.textarea, error ? styles.error : null, className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [ayuda ? `${textareaId}-ayuda` : null, error ? `${textareaId}-error` : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...props}
      />
      {error ? (
        <span id={`${textareaId}-error`} className={styles.errorMessage}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
