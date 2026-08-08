import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Input.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  endAdornment?: ReactNode
}

export function Input({ label, error, id, className, endAdornment, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
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
          aria-describedby={error ? `${inputId}-error` : undefined}
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
