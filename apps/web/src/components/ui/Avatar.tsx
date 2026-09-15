import type { HTMLAttributes } from 'react'
import styles from './Avatar.module.css'

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  nombre: string
  apellidoPaterno: string
  /** URL absoluta de la foto. Sin ella se muestran las iniciales. */
  fotoUrl: string | null
  tamano?: 'sm' | 'lg'
}

/**
 * Foto de perfil, o las iniciales cuando no hay. Es decorativo: el nombre
 * siempre va escrito al lado, así que no repite nada para lector de pantalla.
 */
export function Avatar({
  nombre,
  apellidoPaterno,
  fotoUrl,
  tamano = 'sm',
  className,
  ...props
}: AvatarProps) {
  const clases = [styles.avatar, styles[tamano], className].filter(Boolean).join(' ')

  return (
    <span className={clases} aria-hidden="true" {...props}>
      {fotoUrl ? (
        // La foto exige sesión (docs/diseno-desarrollo-nucleo.md §6.3); en
        // desarrollo el API vive en otro puerto y la cookie solo viaja con
        // credenciales explícitas.
        <img src={fotoUrl} alt="" crossOrigin="use-credentials" className={styles.foto} />
      ) : (
        <>
          {nombre[0]}
          {apellidoPaterno[0]}
        </>
      )}
    </span>
  )
}
