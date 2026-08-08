import { Link } from 'react-router-dom'
import styles from './Encabezado.module.css'

export function Encabezado() {
  return (
    <>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>

      <header>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandName}>Co3</span>
            <span className={styles.brandTagline}>
              Construcción de Conocimiento en Colaboración
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Principal">
            <button type="button" className={styles.navLink}>
              Insignias
            </button>
            <button type="button" className={styles.navLink}>
              Recursos
            </button>
          </nav>
        </div>
      </header>
    </>
  )
}
