import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './AvisoConfirmacion.module.css'

function IconoListo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m6.75 10.25 2.25 2.25 4.25-4.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface AvisoConfirmacionProps {
  titulo: string
  detalle: string
  /** Página pública del contenido, si está publicado. */
  verEn?: string
  seguirEditando?: string
  onCerrar: () => void
}

// Confirmación de lo que se acaba de hacer en un editor del panel, con atajos
// a ver el resultado o a seguir editando.
export function AvisoConfirmacion({
  titulo,
  detalle,
  verEn,
  seguirEditando,
  onCerrar,
}: AvisoConfirmacionProps) {
  const ref = useRef<HTMLDivElement>(null)

  // El foco viene del botón del editor, que ya no existe: se pasa al aviso
  // para que el lector de pantalla lo lea y el teclado siga desde aquí.
  // La página llega con el desplazamiento del editor: se vuelve arriba para
  // que el aviso y el título queden a la vista.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    ref.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div ref={ref} tabIndex={-1} className={styles.confirmacion} role="status">
      <span className={styles.confirmacionIcono}>
        <IconoListo />
      </span>
      <div className={styles.confirmacionTexto}>
        <p className={styles.confirmacionTitulo}>{titulo}</p>
        <p>{detalle}</p>
        {verEn || seguirEditando ? (
          <p className={styles.confirmacionEnlaces}>
            {verEn ? <Link to={verEn}>Ver en Recursos</Link> : null}
            {seguirEditando ? <Link to={seguirEditando}>Seguir editando</Link> : null}
          </p>
        ) : null}
      </div>
      <button type="button" className={styles.confirmacionCerrar} onClick={onCerrar}>
        <span aria-hidden="true">×</span>
        <span className={styles.srOnly}>Cerrar aviso</span>
      </button>
    </div>
  )
}
