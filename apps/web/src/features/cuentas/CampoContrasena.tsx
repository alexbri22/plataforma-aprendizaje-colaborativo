import { useState, type ChangeEvent } from 'react'
import { Input } from '../../components/ui'
import styles from './CampoContrasena.module.css'

function OjoIcono() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M1 8s2.7-4.5 7-4.5S15 8 15 8s-2.7 4.5-7 4.5S1 8 1 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function OjoTachadoIcono() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.6 4.1c.44-.13.9-.2 1.4-.2 4.3 0 7 4.1 7 4.1a13.4 13.4 0 0 1-2.35 2.8M4.2 5.6A13.4 13.4 0 0 0 1 8s2.7 4.1 7 4.1c.96 0 1.85-.2 2.65-.55"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 2.5 14 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export interface CampoContrasenaProps {
  id?: string
  label: string
  value: string
  onChange: (valor: string) => void
  onBlur?: () => void
  error?: string
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
}

export function CampoContrasena({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  disabled,
}: CampoContrasenaProps) {
  const [visible, setVisible] = useState(false)

  function manejarCambio(evento: ChangeEvent<HTMLInputElement>) {
    onChange(evento.target.value)
  }

  return (
    <Input
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={manejarCambio}
      onBlur={() => onBlur?.()}
      error={error}
      autoComplete={autoComplete}
      required
      disabled={disabled}
      endAdornment={
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((valorActual) => !valorActual)}
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        >
          {visible ? <OjoTachadoIcono /> : <OjoIcono />}
        </button>
      }
    />
  )
}
