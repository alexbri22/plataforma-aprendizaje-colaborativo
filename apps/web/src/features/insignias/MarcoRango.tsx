import type { HTMLAttributes, ReactNode } from 'react'
import type { NivelInsignia } from '@plataforma/shared'
import bronce from './assets/marcos/bronce.png'
import diamante from './assets/marcos/diamante.png'
import oro from './assets/marcos/oro.png'
import plata from './assets/marcos/plata.png'
import platino from './assets/marcos/platino.png'
import styles from './MarcoRango.module.css'

const MARCOS: Record<NivelInsignia, string> = { bronce, plata, oro, platino, diamante }

const ENCUADRES: Record<NivelInsignia, string> = {
  bronce: styles.bronce,
  plata: styles.plata,
  oro: styles.oro,
  platino: styles.platino,
  diamante: styles.diamante,
}

export type TamanoMarco = 'sm' | 'md' | 'lg'

const TAMANOS: Record<TamanoMarco, string | undefined> = {
  sm: styles.tamanoSm,
  md: undefined,
  lg: styles.tamanoLg,
}

export interface MarcoRangoProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Nivel alcanzado, o null si la categoría aún no llega al primer umbral. */
  nivel: NivelInsignia | null
  tamano?: TamanoMarco
  children?: ReactNode
}

/**
 * Envuelve cualquier contenido en el marco del rango indicado. Es deliberadamente
 * agnóstico de qué enmarca: hoy lo consume `InsigniaCategoria` con un medallón,
 * y sirve igual para un avatar el día que el perfil lo pida.
 *
 * El marco es decoración: no aporta nombre accesible. Quien lo usa debe nombrar
 * el conjunto, porque un lector de pantalla no puede leer un PNG de un marco.
 */
export function MarcoRango({
  nivel,
  tamano = 'md',
  className,
  children,
  ...props
}: MarcoRangoProps) {
  const clases = [styles.marco, nivel ? ENCUADRES[nivel] : styles.vacio, TAMANOS[tamano], className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={clases} {...props}>
      {nivel ? (
        <img className={styles.imagen} src={MARCOS[nivel]} alt="" aria-hidden />
      ) : (
        <span className={styles.hueco} />
      )}
      <span className={styles.contenido}>{children}</span>
    </span>
  )
}
