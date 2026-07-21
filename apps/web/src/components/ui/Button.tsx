import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : null, className]
    .filter(Boolean)
    .join(' ')

  return <button type={type} className={classes} {...props} />
}
