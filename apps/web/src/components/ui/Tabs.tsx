import { useRef, type KeyboardEvent } from 'react'
import styles from './Tabs.module.css'

export interface TabItem {
  id: string
  etiqueta: string
}

export interface TabsProps {
  label: string
  items: TabItem[]
  valor: string
  onCambiar: (id: string) => void
  className?: string
}

// Patrón WAI-ARIA Tabs (activación automática): flechas mueven el foco y
// seleccionan a la vez. Ver https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
export function Tabs({ label, items, valor, onCambiar, className }: TabsProps) {
  const botones = useRef<Record<string, HTMLButtonElement | null>>({})

  function manejarTeclado(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    let siguiente: number
    if (evento.key === 'ArrowRight') siguiente = (indice + 1) % items.length
    else if (evento.key === 'ArrowLeft') siguiente = (indice - 1 + items.length) % items.length
    else if (evento.key === 'Home') siguiente = 0
    else if (evento.key === 'End') siguiente = items.length - 1
    else return

    evento.preventDefault()
    const item = items[siguiente]
    onCambiar(item.id)
    botones.current[item.id]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={[styles.tablist, className].filter(Boolean).join(' ')}
    >
      {items.map((item, indice) => {
        const activo = item.id === valor
        return (
          <button
            key={item.id}
            ref={(el) => {
              botones.current[item.id] = el
            }}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={activo}
            aria-controls={`panel-${item.id}`}
            tabIndex={activo ? 0 : -1}
            className={[styles.tab, activo ? styles.activo : null].filter(Boolean).join(' ')}
            onClick={() => onCambiar(item.id)}
            onKeyDown={(evento) => manejarTeclado(evento, indice)}
          >
            {item.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
