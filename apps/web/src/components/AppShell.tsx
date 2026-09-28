import { useId, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCerrarSesionMutation, useSesion } from '../features/cuentas'
import { Avatar } from './ui'
import styles from './AppShell.module.css'

export type SeccionApp = 'actividades' | 'perfil' | 'recursos' | 'cuentas'

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

function IconoVolver() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M16 10H4.5M9.5 4.5 4 10l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoCuentas() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="7.5" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.5 16.5c.6-2.6 2.6-4.2 5-4.2s4.4 1.6 5 4.2M13 4.2a3 3 0 0 1 0 5.6M14.8 12.6c1.3.6 2.3 1.9 2.7 3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconoAdministracion() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M10 2.5 4 4.8v4.7c0 3.6 2.5 6.6 6 8 3.5-1.4 6-4.4 6-8V4.8L10 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m7.5 10 1.8 1.8 3.3-3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="m8 5.5 4.5 4.5L8 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
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
  { id: 'perfil', etiqueta: 'Mi perfil', to: '/perfil', Icono: IconoInsignias },
  { id: 'recursos', etiqueta: 'Recursos', to: '/recursos', Icono: IconoRecursos },
]

// Solo se muestra a administradores. Es conveniencia de navegación: la
// autorización real la impone el servidor (exigirAdministrador). Las futuras
// herramientas de administración se agregan aquí y aparecen dentro del grupo.
const ITEMS_NAV_ADMIN: ItemNav[] = [
  { id: 'cuentas', etiqueta: 'Cuentas', to: '/admin/cuentas', Icono: IconoCuentas },
]

// Preferencia de la persona (abierto/cerrado) para el grupo de
// administración. Es una comodidad por navegador: si el almacenamiento no está
// disponible, el grupo simplemente arranca abierto.
const CLAVE_GRUPO_ADMIN_ABIERTO = 'co3.nav.administracion.abierto'

function leerGrupoAdminAbierto(): boolean {
  try {
    return localStorage.getItem(CLAVE_GRUPO_ADMIN_ABIERTO) !== 'false'
  } catch {
    return true
  }
}

function guardarGrupoAdminAbierto(abierto: boolean) {
  try {
    localStorage.setItem(CLAVE_GRUPO_ADMIN_ABIERTO, String(abierto))
  } catch {
    // Sin almacenamiento el grupo solo no recuerda su estado entre pantallas.
  }
}

function ItemNavLink({ item, activo }: { item: ItemNav; activo: boolean }) {
  return (
    <Link
      to={item.to}
      className={[styles.navItem, activo ? styles.navItemActivo : null].filter(Boolean).join(' ')}
      aria-current={activo ? 'page' : undefined}
    >
      <item.Icono />
      {item.etiqueta}
    </Link>
  )
}

// Grupo plegable con las herramientas del rol Administrador, separado de la
// navegación de todos. Estando en una de sus pantallas se abre siempre, para
// que el ítem activo nunca quede oculto.
function GrupoAdministracion({ seccionActiva }: { seccionActiva: SeccionApp }) {
  const idPanel = useId()
  const contieneActiva = ITEMS_NAV_ADMIN.some((item) => item.id === seccionActiva)
  const [abierto, setAbierto] = useState(() => contieneActiva || leerGrupoAdminAbierto())

  function alternar() {
    const siguiente = !abierto
    setAbierto(siguiente)
    guardarGrupoAdminAbierto(siguiente)
  }

  return (
    <div className={styles.grupo}>
      <button
        type="button"
        className={[styles.grupoEncabezado, contieneActiva ? styles.grupoEncabezadoActivo : null]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={alternar}
      >
        <IconoAdministracion />
        <span className={styles.grupoEtiqueta}>Administración</span>
        <IconoChevron className={styles.grupoChevron} />
      </button>

      <div
        id={idPanel}
        className={[styles.grupoPanel, abierto ? styles.grupoPanelAbierto : null]
          .filter(Boolean)
          .join(' ')}
        inert={!abierto}
      >
        <div className={styles.grupoItems}>
          {ITEMS_NAV_ADMIN.map((item) => (
            <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
          ))}
        </div>
      </div>
    </div>
  )
}

export interface AppShellProps {
  seccionActiva: SeccionApp
  titulo: string
  /** Pantalla a la que regresa la flecha de la izquierda del título. Sin ella
   * (las pantallas raíz) no hay flecha. */
  volverA?: string
  acciones?: ReactNode
  children: ReactNode
}

// Shell de la app autenticada: sidebar persistente + barra superior con el
// título de la pantalla. Sigue la guía de Navigation de DESIGN.md (referencia
// Linear: compacto, orientado a etiqueta, activo con fondo primary-subtle;
// cromo de navegación en Paper/Shelf, nunca un bloque de color). Las
// pantallas públicas (Inicio, Ingresar, Registrarse) siguen usando Encabezado.
export function AppShell({ seccionActiva, titulo, volverA, acciones, children }: AppShellProps) {
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
          {ITEMS_NAV.map((item) => (
            <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
          ))}

          {usuario?.tipoCuenta === 'administrador' ? (
            <GrupoAdministracion seccionActiva={seccionActiva} />
          ) : null}
        </nav>

        <div className={styles.cuenta}>
          {usuario ? (
            <Link to="/perfil" className={styles.cuentaInfo}>
              <Avatar
                nombre={usuario.nombre}
                apellidoPaterno={usuario.apellidoPaterno}
                fotoUrl={usuario.fotoUrl}
              />
              <span className={styles.nombreUsuario}>
                {usuario.nombre} {usuario.apellidoPaterno}
              </span>
            </Link>
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
          <div className={styles.encabezadoTitulo}>
            {volverA ? (
              <Link to={volverA} className={styles.volver} aria-label="Volver">
                <IconoVolver />
              </Link>
            ) : null}
            <h1 className={styles.titulo}>{titulo}</h1>
          </div>
          {acciones ? <div className={styles.acciones}>{acciones}</div> : null}
        </header>

        <main id="contenido" className={styles.contenido}>
          {children}
        </main>
      </div>
    </div>
  )
}
