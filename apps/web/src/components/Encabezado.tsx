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
            <Link to="/insignias" className={styles.navLink}>
              Insignias
            </Link>
            {/* Sin destino todavía: el contenido formativo público no está
                construido. Se queda como botón inerte hasta que exista, porque
                un enlace que no lleva a ningún lado es peor que uno ausente. */}
            <button type="button" className={styles.navLink}>
              Recursos
            </button>
          </nav>
        </div>
      </header>
    </>
  )
}
