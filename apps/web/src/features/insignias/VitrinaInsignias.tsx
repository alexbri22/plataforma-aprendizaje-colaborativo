import type { HTMLAttributes } from 'react'
import { CATALOGO_INSIGNIAS, type CategoriaInsignia } from '@plataforma/shared'
import { descripcionDeInsignia } from './descripcionDeInsignia'
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
  /** Con `onSeleccionar`, cada insignia es un botón que abre su detalle (las
   * frases recibidas, el progreso). Sin él, la vitrina es solo lectura, que
   * es como se ve en el perfil de otra persona. */
  seleccionada?: CategoriaInsignia | null
  onSeleccionar?: (categoria: CategoriaInsignia) => void
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
  seleccionada = null,
  onSeleccionar,
  className,
  ...props
}: VitrinaInsigniasProps) {
  return (
    <ul className={[styles.vitrina, className].filter(Boolean).join(' ')} {...props}>
      {CATALOGO_INSIGNIAS.map((categoria) => {
        const puntosCategoria = puntos[categoria.id] ?? 0
        const insignia = (
          <InsigniaCategoria
            categoria={categoria.id}
            puntos={puntosCategoria}
            tamano={tamano}
            mostrarEtiqueta={mostrarEtiquetas}
          />
        )
        return (
          <li key={categoria.id}>
            {onSeleccionar ? (
              <button
                type="button"
                className={[styles.boton, seleccionada === categoria.id ? styles.botonActivo : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={seleccionada === categoria.id}
                aria-label={descripcionDeInsignia(categoria.id, puntosCategoria)}
                onClick={() => onSeleccionar(categoria.id)}
              >
                {insignia}
              </button>
            ) : (
              insignia
            )}
          </li>
        )
      })}
    </ul>
  )
}
