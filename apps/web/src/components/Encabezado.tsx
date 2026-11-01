import { Link, NavLink } from 'react-router-dom'
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

          {/* NavLink marca aria-current="page" en el enlace de la pantalla
              actual. La página de muestra de insignias ya no se enlaza: era
              una vitrina interna y confundía como sección del producto. */}
          <nav className={styles.nav} aria-label="Principal">
            {usuario ? (
              <NavLink to="/actividades" className={styles.navLink}>
                Mis actividades
              </NavLink>
            ) : null}
            {esAdministrador ? (
              <>
                <NavLink to="/admin/cuentas" className={styles.navLink}>
                  Cuentas
                </NavLink>
                <NavLink to="/admin/contenido" className={styles.navLink}>
                  Contenido
                </NavLink>
              </>
            ) : null}
            <NavLink to="/recursos" className={styles.navLink}>
              Recursos
            </NavLink>
          </nav>
        </div>
      </header>
    </>
  )
}
