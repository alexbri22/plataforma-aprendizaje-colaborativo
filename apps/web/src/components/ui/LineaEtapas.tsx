import styles from './LineaEtapas.module.css'

export interface LineaEtapasProps {
  etapas: readonly string[]
  /** Índice de la etapa actual; las anteriores se marcan como hechas. */
  actual: number
  /** Nombre de la lista para lectores de pantalla. */
  etiqueta: string
}

/**
 * Pasos de un proceso, con el actual marcado. Neutra salvo la etapa actual
 * y las ya hechas, en el color de acción: sin cuadros de color (DESIGN.md).
 */
export function LineaEtapas({ etapas, actual, etiqueta }: LineaEtapasProps) {
  return (
    <ol className={styles.linea} aria-label={etiqueta}>
      {etapas.map((etapa, indice) => {
        const estado = indice < actual ? 'hecha' : indice === actual ? 'actual' : 'pendiente'
        return (
          <li
            key={etapa}
            className={[styles.etapa, styles[estado]].join(' ')}
            aria-current={estado === 'actual' ? 'step' : undefined}
          >
            <span className={styles.marca} aria-hidden="true" />
            <span className={styles.nombre}>
              {etapa}
              {estado === 'hecha' ? <span className={styles.oculto}> (hecha)</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
