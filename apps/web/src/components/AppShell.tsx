import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCerrarSesionMutation, useSesion } from '../features/cuentas'
import styles from './AppShell.module.css'

export type SeccionApp = 'actividades' | 'insignias' | 'recursos'

interface ItemNav {
  id: SeccionApp
  etiqueta: string
  to: string
  Icono: () => ReactNode
}

function IconoActividades() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect
        x="2.5"
        y="2.5"
        width="6.5"
        height="6.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="2.5"
        width="6.5"
        height="6.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="2.5"
        y="11"
        width="6.5"
        height="6.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="11"
        width="6.5"
        height="6.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function IconoInsignias() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 12.5 5.5 18l4.5-2.3 4.5 2.3-1.5-5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoRecursos() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M3 4.5c1.8-1 4.3-1 6 0v11c-1.7-1-4.2-1-6 0v-11ZM17 4.5c-1.8-1-4.3-1-6 0v11c1.7-1 4.2-1 6 0v-11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoSalir() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8M13 13.5 17 10l-4-3.5M17 10H7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const ITEMS_NAV: ItemNav[] = [
  { id: 'actividades', etiqueta: 'Mis actividades', to: '/actividades', Icono: IconoActividades },
  { id: 'insignias', etiqueta: 'Insignias', to: '/insignias', Icono: IconoInsignias },
  { id: 'recursos', etiqueta: 'Recursos', to: '/recursos', Icono: IconoRecursos },
]

export interface AppShellProps {
  seccionActiva: SeccionApp
  titulo: string
  acciones?: ReactNode
  children: ReactNode
}

// Shell de la app autenticada: sidebar persistente + barra superior con el
// título de la pantalla. Sigue la guía de Navigation de DESIGN.md (referencia
// Linear: compacto, orientado a etiqueta, activo con fondo primary-subtle;
// cromo de navegación en Paper/Shelf, nunca un bloque de color). Las
// pantallas públicas (Inicio, Ingresar, Registrarse) siguen usando Encabezado.
export function AppShell({ seccionActiva, titulo, acciones, children }: AppShellProps) {
  const navigate = useNavigate()
  const { usuario } = useSesion()
  const cerrarSesionMutacion = useCerrarSesionMutation()

  async function manejarCerrarSesion() {
    await cerrarSesionMutacion.mutateAsync()
    navigate('/ingresar')
  }

  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>

      <aside className={styles.sidebar}>
        <Link to="/actividades" className={styles.marca}>
          <img src="/co3-marca.png" alt="Co3" className={styles.marcaImg} />
        </Link>

        <nav className={styles.nav} aria-label="Principal">
          {ITEMS_NAV.map((item) => {
            const activo = item.id === seccionActiva
            return (
              <Link
                key={item.id}
                to={item.to}
                className={[styles.navItem, activo ? styles.navItemActivo : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={activo ? 'page' : undefined}
              >
                <item.Icono />
                {item.etiqueta}
              </Link>
            )
          })}
        </nav>

        <div className={styles.cuenta}>
          {usuario ? (
            <div className={styles.cuentaInfo}>
              <span className={styles.iniciales} aria-hidden="true">
                {usuario.nombre[0]}
                {usuario.apellidoPaterno[0]}
              </span>
              <span className={styles.nombreUsuario}>
                {usuario.nombre} {usuario.apellidoPaterno}
              </span>
            </div>
          ) : null}

          <button
            type="button"
            className={styles.salir}
            onClick={manejarCerrarSesion}
            disabled={cerrarSesionMutacion.isPending}
          >
            <IconoSalir />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={styles.columna}>
        <header className={styles.topbar}>
          <h1 className={styles.titulo}>{titulo}</h1>
          {acciones ? <div className={styles.acciones}>{acciones}</div> : null}
        </header>

        <main id="contenido" className={styles.contenido}>
          {children}
        </main>
      </div>
    </div>
  )
}
