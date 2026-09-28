import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import styles from './Table.module.css'

// Superficie densa tipo Linear (DESIGN.md §5): spacing apretado, jerarquía por
// borde y peso, no por relleno de color. Primitivo compartido para listas de
// control (cuentas, y a futuro participantes). Es composable a propósito: una
// columna de acciones necesita meter un Button, no solo texto.

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  // Nombre accesible de la tabla, imprescindible en una vista densa donde el
  // lector de pantalla necesita saber qué lista está recorriendo. Se rinde
  // como <caption> visualmente oculto.
  caption?: string
}

export function Table({ caption, className, children, ...props }: TableProps) {
  return (
    <div className={styles.scroll}>
      <table className={[styles.table, className].filter(Boolean).join(' ')} {...props}>
        {caption ? <caption className={styles.caption}>{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement>

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={[styles.row, className].filter(Boolean).join(' ')} {...props} />
}

export type TableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement>

export function TableHeaderCell({ scope = 'col', className, ...props }: TableHeaderCellProps) {
  return (
    <th scope={scope} className={[styles.th, className].filter(Boolean).join(' ')} {...props} />
  )
}

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={[styles.td, className].filter(Boolean).join(' ')} {...props} />
}
