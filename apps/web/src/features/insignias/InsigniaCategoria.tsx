import type { HTMLAttributes } from 'react'
import {
  type CategoriaInsignia,
  definicionCategoria,
  definicionNivel,
  nivelParaPuntos,
} from '@plataforma/shared'
import { SIN_RANGO, arteDeInsignia } from './arteInsignias'
import { IconoCategoria } from './IconoCategoria'
import { MarcoRango, type TamanoMarco } from './MarcoRango'
import styles from './InsigniaCategoria.module.css'

const CLASES_TAMANO: Record<TamanoMarco, string | undefined> = {
  sm: styles.tamanoSm,
  md: undefined,
  lg: styles.tamanoLg,
}

export interface InsigniaCategoriaProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  categoria: CategoriaInsignia
  /** Acumulado del usuario en esta categoría. El nivel se deriva de aquí y no se
   * recibe por separado: dos props para un mismo hecho es una invitación a que
   * se contradigan. */
  puntos: number
  tamano?: TamanoMarco
  /** Muestra el nombre de la categoría y su nivel debajo del medallón. Sin ella
   * la insignia sigue siendo accesible: el nombre viaja para lector de pantalla. */
  mostrarEtiqueta?: boolean
}

/**
 * Una categoría con el marco del rango alcanzado. Es la unidad reusable del
 * sistema de recompensas: la vitrina del perfil son seis de estas, y sirve
 * igual suelta junto a un nombre en una lista de participantes.
 */
export function InsigniaCategoria({
  categoria,
  puntos,
  tamano = 'md',
  mostrarEtiqueta = false,
  className,
  ...props
}: InsigniaCategoriaProps) {
  const definicion = definicionCategoria(categoria)
  const nivel = nivelParaPuntos(puntos)
  const nombreNivel = nivel ? definicionNivel(nivel).nombre : null

  const descripcion = nombreNivel
    ? `${definicion.nombre}, nivel ${nombreNivel}`
    : `${definicion.nombre}, sin nivel todavía`

  const arte = arteDeInsignia(categoria, nivel ?? SIN_RANGO)

  // El nombre accesible se declara aquí y no se deja al figcaption: ni todos los
  // motores de accesibilidad derivan el nombre de un figure a partir de él, y sin
  // etiqueta visible no hay figcaption del que derivarlo. La insignia es una
  // imagen decorativa, así que sin esto llegaría al lector sin nombre.
  return (
    <figure
      className={[styles.insignia, className].filter(Boolean).join(' ')}
      aria-label={descripcion}
      {...props}
    >
      {arte ? (
        <img
          className={[styles.arte, CLASES_TAMANO[tamano]].filter(Boolean).join(' ')}
          src={arte}
          alt=""
          aria-hidden
        />
      ) : (
        // Respaldo temporal mientras el arte se sube por tandas: el marco de la
        // primera versión con el medallón encima. Se elimina, junto con
        // MarcoRango e IconoCategoria, cuando estén los 36 PNG.
        <MarcoRango nivel={nivel} tamano={tamano}>
          <IconoCategoria
            categoria={categoria}
            className={[styles.medallon, nivel ? null : styles.sinRango].filter(Boolean).join(' ')}
          />
        </MarcoRango>
      )}

      {mostrarEtiqueta ? (
        <figcaption className={styles.etiqueta}>
          <span className={styles.nombre}>{definicion.nombre}</span>
          <span className={styles.detalle}>{nombreNivel ?? 'Sin nivel'}</span>
        </figcaption>
      ) : null}
    </figure>
  )
}
