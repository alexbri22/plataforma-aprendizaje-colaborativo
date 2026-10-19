import { Link } from 'react-router-dom'
import { useSesion } from '../features/cuentas'
import styles from './Encabezado.module.css'

export function Encabezado() {
  const { usuario } = useSesion()
  const esAdministrador = usuario?.tipoCuenta === 'administrador'

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
            <Link to="/insignias" className={styles.navLink}>
              Insignias
            </Link>
            {esAdministrador ? (
              <>
                <Link to="/admin/cuentas" className={styles.navLink}>
                  Cuentas
                </Link>
                <Link to="/admin/contenido" className={styles.navLink}>
                  Contenido
                </Link>
              </>
            ) : null}
            <Link to="/recursos" className={styles.navLink}>
              Recursos
            </Link>
          </nav>
        </div>
      </header>
    </>
  )
}
