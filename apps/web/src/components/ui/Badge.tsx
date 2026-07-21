import type { HTMLAttributes } from 'react'
import styles from './Badge.module.css'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'accent'
}

export function Badge({ variant = 'primary', className, ...props }: BadgeProps) {
  const classes = [styles.badge, variant !== 'primary' ? styles[variant] : null, className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes} {...props} />
}
