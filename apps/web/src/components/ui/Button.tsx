import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import styles from './Button.module.css'

export interface ButtonOwnProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
}

export type ButtonProps = ButtonOwnProps &
  (
    | ({ to?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
    | ({ to: LinkProps['to'] } & Omit<LinkProps, 'to'>)
  )

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : null, className]
    .filter(Boolean)
    .join(' ')

  if ('to' in props && props.to !== undefined) {
    const { to, ...linkProps } = props
    return <Link to={to} className={classes} {...linkProps} />
  }

  const { type = 'button', ...buttonProps } = props as ButtonHTMLAttributes<HTMLButtonElement>
  return <button type={type} className={classes} {...buttonProps} />
}
