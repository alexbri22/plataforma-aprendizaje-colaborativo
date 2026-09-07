import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

export interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
  // Descripción opcional bajo el título; si se pasa, se asocia con
  // aria-describedby para que el lector de pantalla la anuncie.
  descripcion?: ReactNode
}

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Diálogo suspendido sobre la página (DESIGN.md §4: sombra Overlay, la única
// reservada a lo que suspende el resto del contenido). Maneja el foco por
// requisito de accesibilidad (PRODUCT.md, WCAG 2.1 AA): atrapa Tab dentro del
// diálogo, cierra con Escape y devuelve el foco al abrir/cerrar.
export function Modal({ abierto, onCerrar, titulo, children, descripcion }: ModalProps) {
  const dialogoRef = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  const descripcionId = useId()

  useEffect(() => {
    if (!abierto) return

    const elementoPrevio = document.activeElement as HTMLElement | null

    // Bloquea el scroll del fondo mientras el diálogo está abierto.
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Foco inicial: el primer elemento enfocable del diálogo, o el diálogo
    // mismo si no hubiera ninguno.
    const dialogo = dialogoRef.current
    const primeroEnfocable = dialogo?.querySelector<HTMLElement>(SELECTOR_ENFOCABLE)
    ;(primeroEnfocable ?? dialogo)?.focus()

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        onCerrar()
        return
      }

      if (evento.key !== 'Tab' || !dialogo) return

      const enfocables = Array.from(dialogo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE))
      if (enfocables.length === 0) {
        evento.preventDefault()
        return
      }

      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      const activo = document.activeElement

      if (evento.shiftKey && activo === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPresionarTecla)

    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = overflowPrevio
      // Devuelve el foco a quien abrió el diálogo.
      elementoPrevio?.focus()
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return createPortal(
    <div className={styles.overlay} onMouseDown={onCerrar}>
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcion ? descripcionId : undefined}
        tabIndex={-1}
        className={styles.dialogo}
        // Un clic dentro del diálogo no debe cerrarlo; solo el fondo cierra.
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <h2 id={tituloId} className={styles.titulo}>
          {titulo}
        </h2>
        {descripcion ? (
          <p id={descripcionId} className={styles.descripcion}>
            {descripcion}
          </p>
        ) : null}
        <div className={styles.cuerpo}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
