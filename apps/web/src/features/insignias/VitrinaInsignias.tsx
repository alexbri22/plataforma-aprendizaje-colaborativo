import type { HTMLAttributes } from 'react'
import { CATALOGO_INSIGNIAS, type CategoriaInsignia } from '@plataforma/shared'
import { InsigniaCategoria } from './InsigniaCategoria'
import type { TamanoMarco } from './MarcoRango'
import styles from './VitrinaInsignias.module.css'

export type PuntosPorCategoria = Partial<Record<CategoriaInsignia, number>>

export interface VitrinaInsigniasProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children'> {
  /** Acumulado por categoría. Las que falten se muestran en cero: la vitrina
   * siempre enseña las seis. */
  puntos: PuntosPorCategoria
  tamano?: TamanoMarco
  mostrarEtiquetas?: boolean
}

/**
 * Las seis insignias de un usuario, para el perfil. Se muestran completas
 * aunque estén en cero, porque el hueco de una categoría sin ganar es parte de
 * la lectura: enseña qué hay por delante y contra qué se está progresando.
 */
export function VitrinaInsignias({
  puntos,
  tamano = 'md',
  mostrarEtiquetas = true,
  className,
  ...props
}: VitrinaInsigniasProps) {
  return (
    <ul className={[styles.vitrina, className].filter(Boolean).join(' ')} {...props}>
      {CATALOGO_INSIGNIAS.map((categoria) => (
        <li key={categoria.id}>
          <InsigniaCategoria
            categoria={categoria.id}
            puntos={puntos[categoria.id] ?? 0}
            tamano={tamano}
            mostrarEtiqueta={mostrarEtiquetas}
          />
        </li>
      ))}
    </ul>
  )
}
