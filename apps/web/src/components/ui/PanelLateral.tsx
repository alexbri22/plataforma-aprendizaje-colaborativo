import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import styles from './PanelLateral.module.css'

export interface PanelLateralProps {
  abierto: boolean
  titulo: string
  descripcion?: string
  onCerrar: () => void
  children: ReactNode
}

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Panel modal anclado a la derecha (DESIGN.md, "Side Panel"). Se pinta en un
// portal para que ningún ancestro con overflow lo recorte. Foco y teclado
// siguen el patrón de diálogo modal de WAI-ARIA: el foco entra al abrir y
// vuelve al disparador al cerrar, Esc cierra y Tab no sale del panel.
export function PanelLateral({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  children,
}: PanelLateralProps) {
  const panel = useRef<HTMLDivElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    if (!abierto) return

    const disparador = document.activeElement as HTMLElement | null
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()

    return () => {
      document.body.style.overflow = overflowPrevio
      disparador?.focus()
    }
  }, [abierto])

  if (!abierto) return null

  function manejarTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      onCerrar()
      return
    }
    if (evento.key !== 'Tab' || !panel.current) return

    const enfocables = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES))
    if (enfocables.length === 0) {
      evento.preventDefault()
      return
    }
    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]
    if (
      evento.shiftKey &&
      (document.activeElement === primero || document.activeElement === panel.current)
    ) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primero.focus()
    }
  }

  return createPortal(
    <div
      className={styles.fondo}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={styles.panel}
        onKeyDown={manejarTeclado}
      >
        <div className={styles.encabezado}>
          <div className={styles.textos}>
            <h2 id={idTitulo} className={styles.titulo}>
              {titulo}
            </h2>
            {descripcion ? <p className={styles.descripcion}>{descripcion}</p> : null}
          </div>
          <Button variant="secondary" size="sm" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
        <div className={styles.cuerpo}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
