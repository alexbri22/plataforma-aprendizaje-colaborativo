import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCerrarSesionMutation, useSesion } from '../features/cuentas'
import { Bienvenida, BotonAyuda, usePistas, type PistaDePantalla } from '../features/ayuda'
import { PanelHistorial } from '../features/historial'
import { GrupoNav } from './GrupoNav'
import type {
  ContextoNav,
  EntradaNavActividad,
  ItemNavActividad,
  NavActividad,
} from './navegacion/construirNavActividad'
import { useNavActividad } from './navegacion/useNavActividad'
import { Avatar, Badge, Button } from './ui'
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
  | 'cursos'

interface ItemNav {
  id: SeccionApp
  etiqueta: string
  to: string
  Icono?: () => ReactNode
}

function IconoConsultas() {
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

function IconoCursos() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="m10 4 8 4-8 4-8-4 8-4ZM5.5 10v4c1.2 1.2 2.7 1.8 4.5 1.8s3.3-.6 4.5-1.8v-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
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

// Consultas es la primera ramificación de la barra: Organizo y Participo son
// destinos propios (cada uno con su única acción posible), no pestañas de una
// misma pantalla. "Actividades" no es una entrada del menú: en el mapa de
// navegación es el espacio interno de una actividad concreta (Creación,
// Desarrollo, Cierre), al que se entra eligiendo una desde Organizo o
// Participo, y ese nivel reemplaza a la barra global. El resto de las pantallas de una actividad
// puntual (resumen, configuración, equipos...) siguen usando el valor
// genérico 'actividades' y no marcan ninguno de los dos.
const ITEMS_NAV_CONSULTAS: ItemNav[] = [
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
// cuenta, al pie del menú, que es donde se busca lo que es de uno. Los
// cursos se encuentran dentro de Recursos.
const ITEMS_NAV_APRENDE: ItemNav[] = [{ id: 'recursos', etiqueta: 'Recursos', to: '/recursos' }]

// Del subsistema de formación, todavía sin pantalla: en el mapa, sin enlace.
const PENDIENTES_APRENDE = [
  'Recursos compartidos',
  'Rutas de aprendizaje',
  'Plantillas',
  'Mis diplomas',
]

// Solo se muestra a administradores. Es conveniencia de navegación: la
// autorización real la impone el servidor (exigirAdministrador). Las futuras
// herramientas de administración se agregan aquí y aparecen dentro del grupo.
const ITEMS_NAV_ADMIN: ItemNav[] = [
  { id: 'cuentas', etiqueta: 'Cuentas', to: '/admin/cuentas', Icono: IconoCuentas },
  { id: 'contenido', etiqueta: 'Contenido', to: '/admin/contenido', Icono: IconoRecursos },
  { id: 'cursos', etiqueta: 'Cursos', to: '/admin/cursos', Icono: IconoCursos },
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
      {item.Icono ? <item.Icono /> : null}
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

function contieneActivo(entrada: EntradaNavActividad): boolean {
  if (entrada.tipo === 'item') return entrada.activo
  if (entrada.tipo === 'grupo') return entrada.items.some((item) => item.activo)
  return entrada.entradas.some(contieneActivo)
}

const ETIQUETAS_ESTADO_ETAPA = { actual: 'Actual', hecha: 'Hecha', proxima: 'Próxima' } as const

function EntradaNivel({ entrada }: { entrada: EntradaNavActividad }) {
  if (entrada.tipo === 'item') return <ItemNivel item={entrada} />
  if (entrada.tipo === 'bloque') {
    return (
      <li className={styles.nivelBloque}>
        <span className={styles.nivelBloqueTitulo}>{entrada.etiqueta}</span>
        <ul className={styles.nivelLista}>
          {entrada.entradas.map((hija) => (
            <EntradaNivel key={hija.clave} entrada={hija} />
          ))}
        </ul>
      </li>
    )
  }
  if (entrada.tipo === 'etapa') {
    // Gris neutro para todas; la actual, en el tono primario.
    return (
      <li>
        <GrupoNav
          claveAlmacenamiento={`co3.nav.etapa.${entrada.clave}.abierto`}
          etiqueta={entrada.etiqueta}
          contieneActivo={contieneActivo(entrada)}
          plegadoPorDefecto
          fijo={entrada.estado === 'actual'}
          variante="etapa"
          marca={
            <Badge variant={entrada.estado === 'actual' ? 'primary' : 'neutral'}>
              {ETIQUETAS_ESTADO_ETAPA[entrada.estado]}
            </Badge>
          }
        >
          <ul className={styles.nivelLista}>
            {entrada.entradas.map((hija) => (
              <EntradaNivel key={hija.clave} entrada={hija} />
            ))}
          </ul>
        </GrupoNav>
      </li>
    )
  }
  return (
    <li>
      <GrupoNav
        claveAlmacenamiento={`co3.nav.actividad.${entrada.clave}.abierto`}
        etiqueta={entrada.etiqueta}
        contieneActivo={contieneActivo(entrada)}
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

// Dentro de una actividad, la barra muestra solo ese nivel (la actividad
// con sus etapas, o un equipo para quien organiza), con una flecha al de
// arriba, en vez de un árbol: con varios niveles de sangría los nombres no
// cabían y costaba saber en cuál se estaba.
function NivelActividad({ nav }: { nav: NavActividad }) {
  return (
    <nav className={styles.nivel} aria-label={nav.titulo}>
      <div className={styles.nivelCabecera}>
        <p className={styles.nivelTitulo}>{nav.titulo}</p>
        {nav.subtitulos.map((subtitulo) => (
          <p key={subtitulo} className={styles.nivelSubtitulo}>
            {subtitulo}
          </p>
        ))}
      </div>

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
  /** Pantalla a la que regresa la flecha. Sin ella (las pantallas raíz) no
   * hay flecha. Fuera de una actividad va junto al título; dentro, toma el
   * lugar de la flecha de la barra lateral (pantallas de detalle, como la
   * bitácora de alguien), para que nunca haya dos flechas. */
  volverA?: string
  /** Sin un destino fijo (un perfil se abre desde varios lugares): la flecha
   * regresa a la pantalla anterior, o a Consultas si se llegó directo. */
  volverAlAnterior?: boolean
  /** Nombre de la pantalla a la que regresa la flecha, para lectores de
   * pantalla ("Volver a Participantes"). */
  volverEtiqueta?: string
  /** La actividad (o el equipo) en que se está: la barra lateral muestra ese
   * nivel y la barra superior agrega el Historial. */
  contexto?: ContextoNav
  /** El "?" junto al título, con la ayuda de esta pantalla (features/ayuda). */
  ayuda?: PistaDePantalla
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
  volverAlAnterior = false,
  volverEtiqueta,
  contexto,
  ayuda,
  acciones,
  children,
}: AppShellProps) {
  const navigate = useNavigate()
  const { usuario } = useSesion()
  const cerrarSesionMutacion = useCerrarSesionMutation()
  const navActividad = useNavActividad(contexto)
  const pistas = usePistas()
  // Si la actividad no se pudo cargar, vuelve la navegación general: mejor
  // eso que una barra vacía.
  const nivelVisible = Boolean(contexto) && (navActividad.nav !== null || navActividad.cargando)
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const nombreActividad = navActividad.nav?.nombreActividad
  // Dentro de una actividad hay una sola flecha, la de la barra lateral: sube
  // al nivel de arriba (construirNavActividad), o al destino explícito de una
  // pantalla de detalle.
  const volverBarra = volverA
    ? { etiqueta: volverEtiqueta ?? 'Volver', to: volverA }
    : navActividad.nav?.volver
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

          {nivelVisible && navActividad.nav && volverBarra ? (
            <Link
              to={volverBarra.to}
              className={[styles.navItem, styles.navItemAncestro].join(' ')}
              aria-label={`Volver a ${volverBarra.etiqueta}`}
            >
              <IconoVolver />
              {volverBarra.etiqueta}
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

          {/* Al entrar a una actividad, su nivel reemplaza a la barra global. */}
          {nivelVisible ? null : (
            <nav className={styles.nav} aria-label="Principal">
              <GrupoNav
                claveAlmacenamiento="co3.nav.consultas.abierto"
                etiqueta="Consultas"
                Icono={IconoConsultas}
                contieneActivo={
                  ITEMS_NAV_CONSULTAS.some((item) => item.id === seccionActiva) ||
                  seccionActiva === 'actividades'
                }
                variante="principal"
              >
                {ITEMS_NAV_CONSULTAS.map((item) => (
                  <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
                ))}
              </GrupoNav>

              <GrupoNav
                claveAlmacenamiento="co3.nav.aprende.abierto"
                etiqueta="Aprende colaborando"
                Icono={IconoRecursos}
                contieneActivo={ITEMS_NAV_APRENDE.some((item) => item.id === seccionActiva)}
                variante="principal"
              >
                {ITEMS_NAV_APRENDE.map((item) => (
                  <ItemNavLink key={item.id} item={item} activo={item.id === seccionActiva} />
                ))}
                {PENDIENTES_APRENDE.map((etiqueta) => (
                  <span
                    key={etiqueta}
                    className={[styles.navItem, styles.navItemPendiente].join(' ')}
                  >
                    {etiqueta}
                  </span>
                ))}
              </GrupoNav>

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
          )}
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
            {volverAlAnterior && !volverA && !nivelVisible ? (
              <button
                type="button"
                className={styles.volver}
                aria-label="Volver"
                onClick={() => {
                  // react-router guarda en history.state el índice de la
                  // entrada; 0 es la primera de esta pestaña.
                  const indice = (window.history.state as { idx?: number } | null)?.idx ?? 0
                  if (indice > 0) navigate(-1)
                  else navigate('/actividades')
                }}
              >
                <IconoVolver />
              </button>
            ) : null}
            {volverA && !nivelVisible ? (
              <Link
                to={volverA}
                className={styles.volver}
                aria-label={volverEtiqueta ? `Volver a ${volverEtiqueta}` : 'Volver'}
              >
                <IconoVolver />
              </Link>
            ) : null}
            <h1 className={styles.titulo}>{titulo}</h1>
            {/* Espera a saber el rol en la actividad: el texto cambia según
                se organice o se participe. */}
            {ayuda && !(contexto && navActividad.cargando) ? (
              <BotonAyuda
                key={ayuda}
                idPista={ayuda}
                organiza={navActividad.nav?.rama !== 'participo'}
                enPausa={pistas.pendiente('bienvenida')}
              />
            ) : null}
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

      <Bienvenida />

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
