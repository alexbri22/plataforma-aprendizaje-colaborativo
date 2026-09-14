import { useId, type InputHTMLAttributes } from 'react'
import styles from './Checkbox.module.css'

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId

  return (
    <label className={styles.opcion} htmlFor={checkboxId}>
      <input
        type="checkbox"
        id={checkboxId}
        className={[styles.input, className].filter(Boolean).join(' ')}
        {...props}
      />
      {label}
    </label>
  )
}
