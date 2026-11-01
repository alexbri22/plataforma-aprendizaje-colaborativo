import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCerrarSesionMutation, useSesion } from '../features/cuentas'
import { PanelHistorial } from '../features/historial'
import { GrupoNav } from './GrupoNav'
import type {
  ContextoNav,
  EntradaNavActividad,
  ItemNavActividad,
  NavActividad,
} from './navegacion/construirNavActividad'
import { useNavActividad } from './navegacion/useNavActividad'
import { Avatar, Button } from './ui'
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
  | 'contenido'

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

// Mi perfil no es un ítem de la navegación: se abre desde el nombre de la
// cuenta, al pie del menú, que es donde se busca lo que es de uno.
const ITEMS_NAV: ItemNav[] = [
  { id: 'recursos', etiqueta: 'Recursos', to: '/recursos', Icono: IconoRecursos },
]

// Solo se muestra a administradores. Es conveniencia de navegación: la
// autorización real la impone el servidor (exigirAdministrador). Las futuras
// herramientas de administración se agregan aquí y aparecen dentro del grupo.
const ITEMS_NAV_ADMIN: ItemNav[] = [
  { id: 'cuentas', etiqueta: 'Cuentas', to: '/admin/cuentas', Icono: IconoCuentas },
  { id: 'contenido', etiqueta: 'Contenido', to: '/admin/contenido', Icono: IconoRecursos },
]

function IconoHistorial() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M4.5 4.8 3.3 3.5M4.5 4.8 3.2 5.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 4.8A6.5 6.5 0 1 1 3.5 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 7v3.3l2.3 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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

function ItemNivel({ item }: { item: ItemNavActividad }) {
  if (!item.to) {
    return (
      <li>
        <span className={[styles.nivelItem, styles.nivelItemPendiente].join(' ')}>
          {item.etiqueta}
        </span>
      </li>
    )
  }
  return (
    <li>
      <Link
        to={item.to}
        className={[styles.nivelItem, item.activo ? styles.navItemActivo : null]
          .filter(Boolean)
          .join(' ')}
        aria-current={item.activo ? 'page' : undefined}
      >
        {item.etiqueta}
      </Link>
    </li>
  )
}

function EntradaNivel({ entrada }: { entrada: EntradaNavActividad }) {
  if (entrada.tipo === 'item') return <ItemNivel item={entrada} />
  return (
    <li>
      <GrupoNav
        claveAlmacenamiento={`co3.nav.actividad.${entrada.clave}.abierto`}
        etiqueta={entrada.etiqueta}
        contieneActivo={entrada.items.some((item) => item.activo)}
        plegadoPorDefecto={entrada.plegadoPorDefecto}
        variante="subgrupo"
      >
        <ul className={styles.nivelLista}>
          {entrada.items.map((item) => (
            <ItemNivel key={item.clave} item={item} />
          ))}
        </ul>
      </GrupoNav>
    </li>
  )
}

// Dentro de una actividad, la barra muestra solo esa actividad, con una
// flecha a Organizo o Participo, en vez de un árbol que cuelga de ellos: con
// cuatro niveles de sangría los nombres no cabían y costaba saber en cuál se
// estaba. Cada equipo va en su propio bloque con título. La flecha conserva
// el color de la rama, que es lo que dice en qué papel se está.
function NivelActividad({ nav }: { nav: NavActividad }) {
  return (
    <nav className={styles.nivel} aria-label="Actividad">
      <p className={styles.nivelTitulo}>{nav.titulo}</p>

      {nav.secciones.map((seccion) => (
        <div key={seccion.clave} className={styles.nivelSeccion}>
          {seccion.titulo ? <p className={styles.nivelSeccionTitulo}>{seccion.titulo}</p> : null}
          <ul className={styles.nivelLista}>
            {seccion.entradas.map((entrada) => (
              <EntradaNivel key={entrada.clave} entrada={entrada} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

const CLAVE_DESPLAZAMIENTO = 'co3.barraLateral.desplazamiento'

// Cada pantalla monta su propio AppShell, así que sin esto la barra lateral
// volvería arriba con cada clic: se recuerda dónde estaba (por pestaña) y,
// si el ítem actual quedó fuera de la vista, se lleva justo a ella. Se mide
// a mano en vez de usar scrollIntoView, que también movería la página.
function useDesplazamientoBarra(listo: boolean) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const caja = ref.current
    if (!caja || !listo) return
    try {
      const guardado = sessionStorage.getItem(CLAVE_DESPLAZAMIENTO)
      if (guardado) caja.scrollTop = Number(guardado)
    } catch {
      // Sin almacenamiento la barra solo arranca desde arriba.
    }
    const activo = caja.querySelector<HTMLElement>('[aria-current="page"]')
    if (!activo) return
    const margen = 24
    const limites = caja.getBoundingClientRect()
    const item = activo.getBoundingClientRect()
    if (item.top < limites.top) caja.scrollTop -= limites.top - item.top + margen
    else if (item.bottom > limites.bottom) caja.scrollTop += item.bottom - limites.bottom + margen
  }, [listo])

  return ref
}

function guardarDesplazamiento(evento: UIEvent<HTMLDivElement>) {
  try {
    sessionStorage.setItem(CLAVE_DESPLAZAMIENTO, String(evento.currentTarget.scrollTop))
  } catch {
    // Sin almacenamiento la barra solo no recuerda su posición.
  }
}

export interface AppShellProps {
  seccionActiva: SeccionApp
  titulo: string
  /** Pantalla a la que regresa la flecha de la izquierda del título. Sin ella
   * (las pantallas raíz) no hay flecha. Dentro de una actividad solo la usan
   * las pantallas de detalle: el resto se ubica con la barra lateral. */
  volverA?: string
  /** Nombre de la pantalla a la que regresa la flecha, para lectores de
   * pantalla ("Volver a Participantes"). */
  volverEtiqueta?: string
  /** La actividad (o el equipo) en que se está: la barra lateral muestra ese
   * nivel y la barra superior agrega el Historial. */
  contexto?: ContextoNav
  acciones?: ReactNode
  children: ReactNode
}

// Shell de la app autenticada: sidebar persistente + barra superior con el
// título de la pantalla. Sigue la guía de Navigation de DESIGN.md (referencia
// Linear: compacto, orientado a etiqueta, activo con fondo primary-subtle;
// cromo de navegación en Paper/Shelf, nunca un bloque de color). Las
// pantallas públicas (Inicio, Ingresar, Registrarse) siguen usando Encabezado.
export function AppShell({
  seccionActiva,
  titulo,
  volverA,
  volverEtiqueta,
  contexto,
  acciones,
  children,
}: AppShellProps) {
  const navigate = useNavigate()
  const { usuario } = useSesion()
  const cerrarSesionMutacion = useCerrarSesionMutation()
  const navActividad = useNavActividad(contexto)
  // Si la actividad no se pudo cargar, vuelve la navegación general: mejor
  // eso que una barra vacía.
  const nivelVisible = Boolean(contexto) && (navActividad.nav !== null || navActividad.cargando)
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const nombreActividad = navActividad.nav?.nombreActividad
  const refBarra = useDesplazamientoBarra(!nivelVisible || navActividad.nav !== null)

  // Cada pestaña y cada entrada del historial del navegador dice dónde lleva
  // ("Equipos · Taller de Ecología · Co3"), no el mismo nombre para todo.
  useEffect(() => {
    document.title = [titulo, nombreActividad, 'Co3'].filter(Boolean).join(' · ')
  }, [titulo, nombreActividad])

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
        {/* Arriba y abajo quedan fijos (marca, regreso, cuenta); solo se
            desplaza la lista de en medio, que es la que puede crecer. */}
        <div className={styles.sidebarCabecera}>
          <Link to="/actividades" className={styles.marca}>
            <img src="/co3-marca.png" alt="Co3" className={styles.marcaImg} />
          </Link>

          {nivelVisible && navActividad.nav ? (
            <Link
              to={navActividad.nav.volver.to}
              className={[styles.navItem, styles.navItemAncestro].join(' ')}
              aria-label={`Volver a ${navActividad.nav.volver.etiqueta}`}
            >
              <IconoVolver />
              {navActividad.nav.volver.etiqueta}
            </Link>
          ) : null}
        </div>

        <div ref={refBarra} className={styles.sidebarDesplazable} onScroll={guardarDesplazamiento}>
          {nivelVisible ? (
            navActividad.nav ? (
              <NivelActividad nav={navActividad.nav} />
            ) : (
              <div className={styles.nivelCargando} aria-hidden="true" />
            )
          ) : null}

          <nav
            className={[styles.nav, nivelVisible ? styles.navSecundaria : null]
              .filter(Boolean)
              .join(' ')}
            aria-label="Principal"
          >
            {nivelVisible ? null : (
              <GrupoNav
                claveAlmacenamiento="co3.nav.actividades.abierto"
                etiqueta="Actividades"
                Icono={IconoActividades}
                contieneActivo={
                  ITEMS_NAV_ACTIVIDADES.some((item) => item.id === seccionActiva) ||
                  seccionActiva === 'actividades'
                }
                variante="principal"
              >
                {ITEMS_NAV_ACTIVIDADES.map((item) => (
                  <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
                ))}
              </GrupoNav>
            )}

            {ITEMS_NAV.map((item) => (
              <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
            ))}

            {usuario?.tipoCuenta === 'administrador' ? (
              <GrupoNav
                claveAlmacenamiento="co3.nav.administracion.abierto"
                etiqueta="Administración"
                Icono={IconoAdministracion}
                contieneActivo={ITEMS_NAV_ADMIN.some((item) => item.id === seccionActiva)}
                variante="seccion"
              >
                {ITEMS_NAV_ADMIN.map((item) => (
                  <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
                ))}
              </GrupoNav>
            ) : null}
          </nav>
        </div>

        <div className={styles.cuenta}>
          {usuario ? (
            <Link
              to="/perfil"
              className={[
                styles.cuentaInfo,
                seccionActiva === 'perfil' ? styles.cuentaActiva : null,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${usuario.nombre} ${usuario.apellidoPaterno}, ver mi perfil`}
              aria-current={seccionActiva === 'perfil' ? 'page' : undefined}
            >
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
              <Link
                to={volverA}
                className={styles.volver}
                aria-label={volverEtiqueta ? `Volver a ${volverEtiqueta}` : 'Volver'}
              >
                <IconoVolver />
              </Link>
            ) : null}
            <h1 className={styles.titulo}>{titulo}</h1>
          </div>
          {acciones || navActividad.idActividad ? (
            <div className={styles.acciones}>
              {acciones}
              {/* Panel lateral y no una pantalla (decisión de producto): no
                  saca a nadie de donde está. Dentro de un equipo se acota a
                  ese equipo (nucleo §5.5). */}
              {navActividad.idActividad ? (
                <Button variant="ghost" size="sm" onClick={() => setHistorialAbierto(true)}>
                  <IconoHistorial />
                  Historial
                </Button>
              ) : null}
            </div>
          ) : null}
        </header>

        <main id="contenido" className={styles.contenido}>
          {children}
        </main>
      </div>

      {navActividad.idActividad ? (
        <PanelHistorial
          idActividad={navActividad.idActividad}
          idEquipo={navActividad.idEquipo ?? undefined}
          idMiMembresia={navActividad.idMiMembresia}
          abierto={historialAbierto}
          onCerrar={() => setHistorialAbierto(false)}
        />
      ) : null}
    </div>
  )
}
