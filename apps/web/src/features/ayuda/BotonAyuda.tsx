import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../components/ui'
import { textoPista, type PistaDePantalla } from './catalogo'
import { usePistas } from './usePistas'
import styles from './BotonAyuda.module.css'

export interface BotonAyudaProps {
  idPista: PistaDePantalla
  organiza: boolean
  /** Mientras la bienvenida está pendiente, ninguna ayuda se abre sola:
   * una cosa a la vez. */
  enPausa: boolean
}

// El "?" junto al título de cada pantalla (patrón toggletip): la primera vez
// que la persona llega, se abre solo con un "Entendido"; después, solo al
// hacer clic. No es un tour: una ayuda por pantalla, que no tapa la
// pantalla ni atrapa el foco. Abrirse sola no le roba el foco a nadie; al
// abrirla con clic, el foco pasa a "Entendido" y vuelve al "?" al cerrar.
export function BotonAyuda({ idPista, organiza, enPausa }: BotonAyudaProps) {
  const pistas = usePistas()
  const pendiente = pistas.pendiente(idPista)
  const [abierto, setAbierto] = useState(false)
  const [autoAbierta, setAutoAbierta] = useState(false)
  const idPanel = useId()
  const idTitulo = useId()
  const contenedorRef = useRef<HTMLSpanElement>(null)
  const botonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const { titulo, cuerpo } = textoPista(idPista, organiza)

  // Ajuste durante el render, no en un efecto: en cuanto se sabe que la
  // ayuda está pendiente, se abre una sola vez.
  if (pendiente && !enPausa && !autoAbierta) {
    setAutoAbierta(true)
    setAbierto(true)
  }

  function cerrar(devolverFoco: boolean) {
    setAbierto(false)
    if (pendiente) pistas.marcar(idPista)
    if (devolverFoco) botonRef.current?.focus()
  }

  // Escape y clic fuera cierran, como cualquier globo. Cerrar cuenta como
  // vista: la persona ya la leyó, o decidió que no la necesita.
  useEffect(() => {
    if (!abierto) return
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      const dentro = contenedorRef.current?.contains(document.activeElement)
      cerrar(Boolean(dentro))
    }
    function alHacerClic(evento: MouseEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) cerrar(false)
    }
    document.addEventListener('keydown', alPresionarTecla)
    document.addEventListener('mousedown', alHacerClic)
    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.removeEventListener('mousedown', alHacerClic)
    }
  })

  function alternar() {
    if (abierto) {
      cerrar(false)
      return
    }
    setAbierto(true)
    // Al abrirla a propósito, el foco va al contenido para leerlo y cerrarlo.
    requestAnimationFrame(() => panelRef.current?.querySelector('button')?.focus())
  }

  return (
    <span ref={contenedorRef} className={styles.contenedor}>
      <button
        ref={botonRef}
        type="button"
        className={[styles.boton, abierto ? styles.botonAbierto : null].filter(Boolean).join(' ')}
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={`Ayuda: ${titulo}`}
        onClick={alternar}
      >
        ?
      </button>
      {abierto ? (
        <div
          ref={panelRef}
          id={idPanel}
          role="dialog"
          aria-labelledby={idTitulo}
          className={styles.panel}
        >
          <p id={idTitulo} className={styles.titulo}>
            {titulo}
          </p>
          <p className={styles.cuerpo}>{cuerpo}</p>
          <Button size="sm" variant="secondary" onClick={() => cerrar(true)}>
            Entendido
          </Button>
        </div>
      ) : null}
    </span>
  )
}
