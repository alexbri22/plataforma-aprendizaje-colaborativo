import { parsearEstadoEspacioEquipo, type ElementoEspacioEquipo } from '@plataforma/shared'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatearFecha, useActividad, type Actividad } from '../features/actividades'
import { useEquipo } from '../features/equipos/useEquipos'
import { useCerrarSesionMutation, useSesion } from '../features/cuentas'
import { useRitual } from '../features/insignias'
import { Avatar, IconoCargando } from './ui'
import { GrupoNav } from './GrupoNav'
import styles from './AppShellEquipo.module.css'

export type SeccionEspacioEquipo = ElementoEspacioEquipo

const ETIQUETAS: Record<SeccionEspacioEquipo, string> = {
  metas: 'Metas',
  avances: 'Avances',
  recursos: 'Recursos',
}

// Orden fijo de la navegación, independiente del orden en que
// ELEMENTOS_ESPACIO_EQUIPO los declara.
const SECCIONES: readonly SeccionEspacioEquipo[] = ['metas', 'avances', 'recursos']

// Los cinco aspectos de Johnson y Johnson (maqueta de referencia de las
// organizadoras). Sección fuera de alcance de este incremento (ver
// SeccionProcesoColaborativo en Configuración): aquí solo anuncia que existe,
// sin pantallas ni backend todavía — nucleo §9.1 no la cubre.
const ASPECTOS_PROCESO_COLABORATIVO = [
  'Responsabilidades',
  'Interdependencia positiva',
  'Interacción',
  'Evaluación individual y de grupo',
  'Habilidades sociales',
] as const

// Un valor ilegible se trata como habilitado: lo conservador para no ocultar
// una sección por un dato corrupto (mismo criterio que cambiosDeFuncion.ts
// en el servidor).
function estaHabilitada(actividad: Actividad, seccion: SeccionEspacioEquipo): boolean {
  const serializado = actividad.configuracion?.espacio_equipo
  if (!serializado) return true
  const estado = parsearEstadoEspacioEquipo(serializado)
  return estado === null || estado[seccion] !== 'deshabilitado'
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

function IconoEquipo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7.5" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="8" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.8 16c.5-2.7 2-4.2 4.2-4.2s3.7 1.5 4.2 4.2M12 12.2c1.8 0 3 1.2 3.4 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconoProyecto() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect
        x="4.5"
        y="4"
        width="11"
        height="13"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="7.5"
        y="2.5"
        width="5"
        height="3"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 9.5h6M7 12.5h6M7 15.5h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconoProceso() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M5 6.5h8.5M13.5 6.5l-2-2M13.5 6.5l-2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 13.5H6.5M6.5 13.5l2-2M6.5 13.5l2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoHonoramiento() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="7.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 11.3 5.8 17l4.2-2.2 4.2 2.2L13 11.3"
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

interface ItemSeccionProps {
  seccion: SeccionEspacioEquipo
  idEquipo: string
  activa: boolean
}

function ItemSeccion({ seccion, idEquipo, activa }: ItemSeccionProps) {
  return (
    <Link
      to={`/equipos/${idEquipo}/${seccion}`}
      className={[styles.navItem, activa ? styles.navItemActivo : null].filter(Boolean).join(' ')}
      aria-current={activa ? 'page' : undefined}
    >
      {ETIQUETAS[seccion]}
    </Link>
  )
}

// Reconocer al equipo y Mis reconocimientos (nucleo §1.3, ritual ya
// implementado en features/insignias): son del equipo del actor, no de la
// actividad completa, así que entran aquí y no en los accesos de gestión del
// resumen. Llevan a pantallas con AppShell (el shell global), no con este —
// salir del espacio de equipo a propósito es correcto, no un error.
function ItemHonoramiento({ to, etiqueta }: { to: string; etiqueta: string }) {
  return (
    <Link to={to} className={styles.navItem}>
      {etiqueta}
    </Link>
  )
}

// Proceso colaborativo (los 5 aspectos de Johnson y Johnson) queda fuera de
// este incremento (ver docs/diseno-desarrollo-nucleo.md §9.1 y la
// vista previa sin guardar de Configuración): se anuncia aquí, sin enlace,
// para que la sección exista en el mapa del sitio sin prometer una pantalla
// que todavía no hay.
function ItemProcesoPlaceholder({ etiqueta }: { etiqueta: string }) {
  return <span className={styles.navItemDeshabilitado}>{etiqueta}</span>
}

export interface AppShellEquipoProps {
  idEquipo: string
  seccionActiva: SeccionEspacioEquipo
  titulo: string
  acciones?: ReactNode
  children: ReactNode
}

// Shell de navegación scoped al espacio de un equipo (decisión de producto
// del incremento "Espacio de equipo y cierre de fase"): reemplaza por
// completo al sidebar global de AppShell mientras alguien trabaja dentro del
// Proyecto colaborativo de un equipo puntual — nunca los dos sidebars a la
// vez. Las pantallas de gestión (Configurar, Equipos, el resumen) no entran
// aquí: siguen usando AppShell con sus botones ghost del topbar.
export function AppShellEquipo({
  idEquipo,
  seccionActiva,
  titulo,
  acciones,
  children,
}: AppShellEquipoProps) {
  const equipoQuery = useEquipo(idEquipo)
  const idActividad = equipoQuery.data?.idActividad
  const actividadQuery = useActividad(idActividad ?? '', { enabled: Boolean(idActividad) })
  // Honoramiento es "reconoce a tus compañeros": solo tiene sentido para
  // quien integra este equipo, igual que mostrarEspacio en TarjetaEquipo.
  const soyIntegrante = equipoQuery.data
    ? equipoQuery.data.integrantes.some((i) => i.idMembresia === equipoQuery.data.idMiMembresia)
    : false
  // "Reconocer al equipo" y "Mis reconocimientos" no están abiertos siempre
  // (docs/diseno-desarrollo-insignias.md §3.5): mismo contexto del ritual que
  // AccionesReconocimiento usa en el resumen de la actividad para decidir lo
  // mismo, para que las dos ubicaciones coincidan.
  const ritualQuery = useRitual(idActividad ?? '', { enabled: Boolean(idActividad) })
  const ritual = ritualQuery.data?.contexto
  const { usuario } = useSesion()
  const cerrarSesionMutacion = useCerrarSesionMutation()
  const navigate = useNavigate()

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

        <Link to="/actividades" className={styles.volver}>
          <IconoVolver />
          Mis actividades
        </Link>

        {equipoQuery.isPending ? (
          <div className={styles.cargando} role="status" aria-label="Cargando el equipo">
            <IconoCargando size={20} />
          </div>
        ) : equipoQuery.isError || !equipoQuery.data ? (
          <p className={styles.ayuda}>
            No encontramos este equipo, o no formas parte de su actividad.
          </p>
        ) : (
          <>
            <div className={styles.infoEquipo}>
              {actividadQuery.data ? (
                <>
                  <p className={styles.nombreActividad}>{actividadQuery.data.nombre}</p>
                  <p className={styles.detalle}>Organiza {actividadQuery.data.nombreOrganizador}</p>
                  {actividadQuery.data.fechaTermino ? (
                    <p className={styles.detalle}>
                      Cierra el {formatearFecha(actividadQuery.data.fechaTermino)}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            {actividadQuery.data ? (
              <nav className={styles.nav} aria-label="Navegación del equipo">
                <GrupoNav
                  claveAlmacenamiento="co3.navEquipo.integrantes.abierto"
                  etiqueta={equipoQuery.data.nombre}
                  Icono={IconoEquipo}
                  contieneActivo
                >
                  {/* Sin enlace todavía (decisión pendiente: a dónde debería
                      llevar el nombre de cada integrante). */}
                  {equipoQuery.data.integrantes.map((integrante) => (
                    <span key={integrante.idMembresia} className={styles.integrante}>
                      {integrante.nombre}
                    </span>
                  ))}
                </GrupoNav>

                <GrupoNav
                  claveAlmacenamiento="co3.navEquipo.proyecto.abierto"
                  etiqueta="Proyecto colaborativo"
                  Icono={IconoProyecto}
                  contieneActivo={SECCIONES.includes(seccionActiva)}
                >
                  {/* Una sección deshabilitada no existe en la interfaz
                      (nucleo §4.3); la actual, si llegó por URL directa,
                      sigue mostrándose para que la pantalla explique por qué
                      no hay nada aquí en vez de desaparecer sin aviso. */}
                  {SECCIONES.filter(
                    (seccion) =>
                      seccion === seccionActiva || estaHabilitada(actividadQuery.data, seccion),
                  ).map((seccion) => (
                    <ItemSeccion
                      key={seccion}
                      seccion={seccion}
                      idEquipo={idEquipo}
                      activa={seccionActiva === seccion}
                    />
                  ))}
                </GrupoNav>

                <GrupoNav
                  claveAlmacenamiento="co3.navEquipo.proceso.abierto"
                  etiqueta="Proceso colaborativo"
                  Icono={IconoProceso}
                >
                  {ASPECTOS_PROCESO_COLABORATIVO.map((aspecto) => (
                    <ItemProcesoPlaceholder key={aspecto} etiqueta={aspecto} />
                  ))}
                </GrupoNav>

                {soyIntegrante && ritual && (ritual.abierto || ritual.aplicados) ? (
                  <GrupoNav
                    claveAlmacenamiento="co3.navEquipo.honoramiento.abierto"
                    etiqueta="Honoramiento"
                    Icono={IconoHonoramiento}
                  >
                    {ritual.abierto ? (
                      <ItemHonoramiento
                        to={`/actividades/${idActividad}/reconocer`}
                        etiqueta="Reconocer al equipo"
                      />
                    ) : null}
                    <ItemHonoramiento
                      to={`/actividades/${idActividad}/insignias`}
                      etiqueta="Mis reconocimientos"
                    />
                  </GrupoNav>
                ) : null}
              </nav>
            ) : null}
          </>
        )}

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
