import { paginasVisibles } from './paginasVisibles'
import styles from './Paginacion.module.css'

export interface PaginacionProps {
  pagina: number
  totalPaginas: number
  onCambiar: (pagina: number) => void
  /** Nombre accesible de la navegación, p. ej. "Páginas de artículos". Hace
   * falta cuando hay más de una paginación en la misma pantalla. */
  etiqueta?: string
  deshabilitada?: boolean
}

// Navegación entre páginas (DESIGN.md §5: controles sobrios, la página actual
// marcada con fondo primary-subtle y aria-current, nunca solo con color). Con
// una sola página no se muestra.
export function Paginacion({
  pagina,
  totalPaginas,
  onCambiar,
  etiqueta = 'Paginación',
  deshabilitada = false,
}: PaginacionProps) {
  if (totalPaginas <= 1) return null

  return (
    <nav className={styles.paginacion} aria-label={etiqueta}>
      <button
        type="button"
        className={styles.boton}
        onClick={() => onCambiar(pagina - 1)}
        disabled={deshabilitada || pagina <= 1}
      >
        <span aria-hidden="true">←</span> Anterior
      </button>

      <ol className={styles.paginas}>
        {paginasVisibles(pagina, totalPaginas).map((entrada, i) =>
          entrada === 'hueco' ? (
            <li key={`hueco-${i}`} className={styles.hueco} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={entrada}>
              <button
                type="button"
                className={entrada === pagina ? styles.paginaActual : styles.pagina}
                aria-current={entrada === pagina ? 'page' : undefined}
                aria-label={`Página ${entrada}`}
                onClick={() => onCambiar(entrada)}
                disabled={deshabilitada}
              >
                {entrada}
              </button>
            </li>
          ),
        )}
      </ol>

      <span className={styles.resumen}>
        Página {pagina} de {totalPaginas}
      </span>

      <button
        type="button"
        className={styles.boton}
        onClick={() => onCambiar(pagina + 1)}
        disabled={deshabilitada || pagina >= totalPaginas}
      >
        Siguiente <span aria-hidden="true">→</span>
      </button>
    </nav>
  )
}
