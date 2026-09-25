import { Button } from './Button'
import styles from './Paginacion.module.css'

export interface PaginacionProps {
  /** Total de elementos, no de páginas. */
  total: number
  /** Elementos por página. */
  tamano: number
  /** Página actual, empezando en 0. */
  pagina: number
  onCambiar: (pagina: number) => void
  /** Qué se está paginando, para el lector de pantalla: "Personas". */
  etiqueta?: string
}

// Paginación de listas largas (DESIGN.md, "Pagination"): rango visible y dos
// botones. No se pinta si todo cabe en una página.
export function Paginacion({
  total,
  tamano,
  pagina,
  onCambiar,
  etiqueta = 'Paginación',
}: PaginacionProps) {
  if (total <= tamano) return null

  const ultima = Math.ceil(total / tamano) - 1
  const desde = pagina * tamano + 1
  const hasta = Math.min(total, (pagina + 1) * tamano)

  return (
    <nav className={styles.paginacion} aria-label={etiqueta}>
      <span className={styles.rango} aria-live="polite">
        {desde}–{hasta} de {total}
      </span>
      <div className={styles.botones}>
        <Button
          variant="secondary"
          size="sm"
          disabled={pagina <= 0}
          onClick={() => onCambiar(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pagina >= ultima}
          onClick={() => onCambiar(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
