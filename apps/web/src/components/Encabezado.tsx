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
              una vitrina interna y confundía como sección del producto.
              Recursos tampoco: desde las observaciones del 4 de noviembre se
              llega por "Aprender colaborando" en el inicio y, con sesión, por
              la barra lateral. Sin sesión no queda ningún enlace, así que la
              navegación no se dibuja. */}
          {usuario ? (
            <nav className={styles.nav} aria-label="Principal">
              <NavLink to="/actividades" className={styles.navLink}>
                Mis actividades
              </NavLink>
              {esAdministrador ? (
                <>
                  <NavLink to="/admin/cuentas" className={styles.navLink}>
                    Cuentas
                  </NavLink>
                  {/* "Recursos" por consistencia con el resto del sitio
                      (observaciones del 12 de noviembre). */}
                  <NavLink to="/admin/contenido" className={styles.navLink}>
                    Recursos
                  </NavLink>
                  <NavLink to="/admin/cursos" className={styles.navLink}>
                    Cursos
                  </NavLink>
                </>
              ) : null}
            </nav>
          ) : null}
        </div>
      </header>
    </>
  )
}
