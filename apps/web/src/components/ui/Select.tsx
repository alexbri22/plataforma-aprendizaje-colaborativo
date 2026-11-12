import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import styles from './Select.module.css'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  /** Una línea bajo la etiqueta que dice para qué se usa el dato (no lo
   * define). Siempre visible: no se esconde en un placeholder ni en un
   * tooltip, porque se necesita para llenar el campo. */
  ayuda?: string
  error?: string
  children: ReactNode
  ocultarEtiqueta?: boolean
}

function ChevronIcono() {
  return (
    <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M4 6.5 8 10.5 12 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Select({
  label,
  ayuda,
  error,
  id,
  className,
  children,
  ocultarEtiqueta,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={styles.field}>
      <label
        className={[styles.label, ocultarEtiqueta ? styles.labelOculta : null]
          .filter(Boolean)
          .join(' ')}
        htmlFor={selectId}
      >
        {label}
      </label>
      {ayuda ? (
        <span id={`${selectId}-ayuda`} className={styles.ayuda}>
          {ayuda}
        </span>
      ) : null}
      <div className={styles.selectWrapper}>
        <select
          id={selectId}
          className={[styles.select, error ? styles.error : null, className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [ayuda ? `${selectId}-ayuda` : null, error ? `${selectId}-error` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          {...props}
        >
          {children}
        </select>
        <ChevronIcono />
      </div>
      {error ? (
        <span id={`${selectId}-error`} className={styles.errorMessage}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
