import { useId, type TextareaHTMLAttributes } from 'react'
import styles from './Textarea.module.css'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function Textarea({ label, error, id, className, rows = 3, ...props }: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={textareaId}>
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={rows}
        className={[styles.textarea, error ? styles.error : null, className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
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
