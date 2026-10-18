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

function Flecha({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg className={styles.icono} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d={direccion === 'izquierda' ? 'M10 3.5 5.5 8 10 12.5' : 'M6 3.5 10.5 8 6 12.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
          className={styles.flecha}
          disabled={pagina <= 0}
          aria-label="Anterior"
          onClick={() => onCambiar(pagina - 1)}
        >
          <Flecha direccion="izquierda" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={styles.flecha}
          disabled={pagina >= ultima}
          aria-label="Siguiente"
          onClick={() => onCambiar(pagina + 1)}
        >
          <Flecha direccion="derecha" />
        </Button>
      </div>
    </nav>
  )
}
