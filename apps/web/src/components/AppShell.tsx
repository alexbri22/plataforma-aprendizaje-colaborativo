import { useId, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCerrarSesionMutation, useSesion } from '../features/cuentas'
import { Avatar } from './ui'
import styles from './AppShell.module.css'

// 'actividades' es el valor genérico para las pantallas dentro de una
// actividad puntual (resumen, configuración, equipos...): no pertenecen a
// Organizo ni a Participo, así que el grupo se muestra abierto/activo pero
// sin marcar ninguno de los dos sub-ítems.
export type SeccionApp =
  | 'actividades'
  | 'actividades-organizo'
  | 'actividades-participo'
  | 'perfil'
  | 'recursos'
  | 'cuentas'

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

function IconoOrganizo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M5.5 17V3M5.5 3.3c1.7-1 3.5-1 5.2 0s3.5 1 5.2 0v7.2c-1.7 1-3.5 1-5.2 0s-3.5-1-5.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoParticipo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 17c.8-3.5 3-5.3 6-5.3s5.2 1.8 6 5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
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

// Actividades es la primera ramificación del mapa del sitio: Organizo y
// Participo son destinos propios (cada uno con su única acción posible), no
// pestañas de una misma pantalla. El resto de las pantallas de una actividad
// puntual (resumen, configuración, equipos...) siguen usando el valor
// genérico 'actividades' y no marcan ninguno de los dos.
const ITEMS_NAV_ACTIVIDADES: ItemNav[] = [
  {
    id: 'actividades-organizo',
    etiqueta: 'Organizo',
    to: '/actividades/organizo',
    Icono: IconoOrganizo,
  },
  {
    id: 'actividades-participo',
    etiqueta: 'Participo',
    to: '/actividades/participo',
    Icono: IconoParticipo,
  },
]

const ITEMS_NAV: ItemNav[] = [
  { id: 'perfil', etiqueta: 'Mi perfil', to: '/perfil', Icono: IconoInsignias },
  { id: 'recursos', etiqueta: 'Recursos', to: '/recursos', Icono: IconoRecursos },
]

// Solo se muestra a administradores. Es conveniencia de navegación: la
// autorización real la impone el servidor (exigirAdministrador). Las futuras
// herramientas de administración se agregan aquí y aparecen dentro del grupo.
const ITEMS_NAV_ADMIN: ItemNav[] = [
  { id: 'cuentas', etiqueta: 'Cuentas', to: '/admin/cuentas', Icono: IconoCuentas },
]

// Preferencia de la persona (abierto/cerrado) por grupo plegable. Es una
// comodidad por navegador: si el almacenamiento no está disponible, el grupo
// simplemente arranca abierto.
function leerGrupoAbierto(clave: string): boolean {
  try {
    return localStorage.getItem(clave) !== 'false'
  } catch {
    return true
  }
}

function guardarGrupoAbierto(clave: string, abierto: boolean) {
  try {
    localStorage.setItem(clave, String(abierto))
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

interface GrupoNavProps {
  claveAlmacenamiento: string
  etiqueta: string
  Icono: () => ReactNode
  items: ItemNav[]
  seccionActiva: SeccionApp
  /** Valores de seccionActiva, además de los ids de `items`, que cuentan como
   * "dentro de este grupo" (p. ej. las pantallas de una actividad puntual,
   * que no pertenecen ni a Organizo ni a Participo). */
  tambienActivoEn?: SeccionApp[]
  /** 'principal': un ítem más de la navegación de todos (Actividades), mismo
   * tamaño que el resto y sin separador. 'seccion': grupo de rol aparte,
   * separado por línea y en versalitas (Administración). */
  variante: 'principal' | 'seccion'
}

// Grupo plegable de navegación: un encabezado que alterna un panel con sus
// ítems. Estando en una de sus pantallas se abre siempre, para que el ítem
// activo nunca quede oculto.
function GrupoNav({
  claveAlmacenamiento,
  etiqueta,
  Icono,
  items,
  seccionActiva,
  tambienActivoEn = [],
  variante,
}: GrupoNavProps) {
  const idPanel = useId()
  const contieneActiva =
    items.some((item) => item.id === seccionActiva) || tambienActivoEn.includes(seccionActiva)
  const [abierto, setAbierto] = useState(
    () => contieneActiva || leerGrupoAbierto(claveAlmacenamiento),
  )

  function alternar() {
    const siguiente = !abierto
    setAbierto(siguiente)
    guardarGrupoAbierto(claveAlmacenamiento, siguiente)
  }

  const esPrincipal = variante === 'principal'

  return (
    <div className={esPrincipal ? styles.grupoPrincipal : styles.grupo}>
      <button
        type="button"
        className={[
          esPrincipal ? styles.grupoEncabezadoPrincipal : styles.grupoEncabezado,
          contieneActiva ? styles.grupoEncabezadoActivo : null,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={alternar}
      >
        <Icono />
        <span className={styles.grupoEtiqueta}>{etiqueta}</span>
        <IconoChevron className={styles.grupoChevron} />
      </button>

      <div
        id={idPanel}
        className={[styles.grupoPanel, abierto ? styles.grupoPanelAbierto : null]
          .filter(Boolean)
          .join(' ')}
        inert={!abierto}
      >
        <div
          className={[styles.grupoItems, esPrincipal ? styles.grupoItemsPrincipal : null]
            .filter(Boolean)
            .join(' ')}
        >
          {items.map((item) => (
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
          <GrupoNav
            claveAlmacenamiento="co3.nav.actividades.abierto"
            etiqueta="Actividades"
            Icono={IconoActividades}
            items={ITEMS_NAV_ACTIVIDADES}
            seccionActiva={seccionActiva}
            tambienActivoEn={['actividades']}
            variante="principal"
          />

          {ITEMS_NAV.map((item) => (
            <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
          ))}

          {usuario?.tipoCuenta === 'administrador' ? (
            <GrupoNav
              claveAlmacenamiento="co3.nav.administracion.abierto"
              etiqueta="Administración"
              Icono={IconoAdministracion}
              items={ITEMS_NAV_ADMIN}
              seccionActiva={seccionActiva}
              variante="seccion"
            />
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
