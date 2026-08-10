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
            <img src="/co3-marca.png" alt="Co3" className={styles.brandMark} />
            <span className={styles.divider} aria-hidden="true" />
            <span className={styles.brandTagline}>
              <span className={styles.tagCoNavy}>co</span>nstrucción de{' '}
              <span className={styles.tagCoTeal}>co</span>nocimiento
              <br />
              en <span className={styles.tagCoOrange}>co</span>laboración
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
