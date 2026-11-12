import { useId, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Badge, Card, IconoCargando, Paginacion, rebanar } from '../../components/ui'
import { useAvanceDeInstrumentos, useMisInstrumentos } from '../evaluacion/useRespuestas'
import {
  construirAgenda,
  hoyEnCalendario,
  type EntradaAgenda,
  type GrupoAgenda,
  type SeccionAgenda,
} from './agendaOperacion'
import {
  bitacoraHabilitada,
  ELEMENTOS_ESPACIO_EQUIPO,
  type ElementoConCalendario,
} from '@plataforma/shared'
import { estaHabilitada } from './espacioEquipo'
import { formatearFecha } from './formato'
import { useActividad, useEntregasPorPeriodo, usePeriodos } from './useActividades'
import styles from './PantallaOperacion.module.css'

const TITULO = 'Operación de la planeación'
const TAMANO_PAGINA = 10

const FORMATO_DIA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })

function dia(fechaIso: string): string {
  const [anio, mes, d] = fechaIso.split('-').map(Number)
  return FORMATO_DIA.format(new Date(anio, mes - 1, d))
}

function fechas(entrada: EntradaAgenda): string | null {
  if (!entrada.desde || !entrada.hasta) return null
  return entrada.desde === entrada.hasta
    ? dia(entrada.desde)
    : `${dia(entrada.desde)} – ${dia(entrada.hasta)}`
}

function tituloGrupo(grupo: GrupoAgenda, hoy: string): string {
  switch (grupo) {
    case 'vencido':
      return 'Vencido'
    case 'hoy':
      return `Hoy · ${formatearFecha(hoy)}`
    case 'semana':
      return 'Esta semana'
    case 'proximo':
      return 'Más adelante'
    case 'sinFecha':
      return 'Sin fecha'
    case 'pasado':
      return 'Ya pasó'
  }
}

function Estado({ entrada, vencido }: { entrada: EntradaAgenda; vencido: boolean }) {
  if (entrada.progreso) {
    const { hechos, total, unidad } = entrada.progreso
    const completo = total > 0 && hechos >= total
    return (
      <Badge variant={completo ? 'success' : vencido ? 'warning' : 'neutral'}>
        {hechos} de {total} {unidad}
      </Badge>
    )
  }
  if (entrada.hecho === undefined) return null
  return entrada.hecho ? (
    <Badge variant="success">Hecho</Badge>
  ) : (
    <Badge variant={vencido ? 'warning' : 'neutral'}>Pendiente</Badge>
  )
}

function Fila({ entrada, vencido }: { entrada: EntradaAgenda; vencido: boolean }) {
  const cuando = fechas(entrada)
  return (
    <li className={styles.fila}>
      <div className={styles.queEs}>
        {entrada.to ? (
          <Link to={entrada.to} className={styles.titulo}>
            {entrada.titulo}
          </Link>
        ) : (
          <span className={styles.titulo}>{entrada.titulo}</span>
        )}
        {entrada.detalle ? <span className={styles.detalle}>{entrada.detalle}</span> : null}
      </div>
      <div className={styles.cuando}>
        {cuando ? <span className={styles.fecha}>{cuando}</span> : null}
        <Estado entrada={entrada} vencido={vencido} />
      </div>
    </li>
  )
}

// Lo de hoy y esta semana arranca abierto; lo demás, plegado, con su cuenta
// en el encabezado para que no se pierda. La persona decide después y su
// elección se recuerda en el navegador.
const ABIERTO_POR_DEFECTO: Record<GrupoAgenda, boolean> = {
  vencido: false,
  hoy: true,
  semana: true,
  proximo: false,
  sinFecha: false,
  pasado: false,
}

function claveGrupo(grupo: GrupoAgenda): string {
  return `co3.operacion.${grupo}.abierto`
}

function leerAbierto(grupo: GrupoAgenda): boolean {
  try {
    const guardado = localStorage.getItem(claveGrupo(grupo))
    return guardado === null ? ABIERTO_POR_DEFECTO[grupo] : guardado === 'true'
  } catch {
    return ABIERTO_POR_DEFECTO[grupo]
  }
}

function guardarAbierto(grupo: GrupoAgenda, abierto: boolean) {
  try {
    localStorage.setItem(claveGrupo(grupo), String(abierto))
  } catch {
    // Sin almacenamiento, el grupo solo no recuerda su estado.
  }
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

function Grupo({ seccion, hoy }: { seccion: SeccionAgenda; hoy: string }) {
  const [pagina, setPagina] = useState(0)
  const [abierto, setAbierto] = useState(() => leerAbierto(seccion.grupo))
  const idLista = useId()
  const { visibles, pagina: paginaActual } = rebanar(seccion.entradas, pagina, TAMANO_PAGINA)
  const titulo = tituloGrupo(seccion.grupo, hoy)
  const alternar = () => {
    guardarAbierto(seccion.grupo, !abierto)
    setAbierto(!abierto)
  }
  return (
    <Card className={styles.grupo}>
      <h2 className={styles.tituloGrupo}>
        <button
          type="button"
          className={styles.encabezado}
          aria-expanded={abierto}
          aria-controls={idLista}
          onClick={alternar}
        >
          <IconoChevron
            className={[styles.chevron, abierto ? styles.chevronAbierto : null]
              .filter(Boolean)
              .join(' ')}
          />
          <span>{titulo}</span>
          <Badge variant="neutral">{seccion.entradas.length}</Badge>
        </button>
      </h2>
      {abierto ? (
        <div id={idLista} className={styles.cuerpo}>
          <ul className={styles.lista} aria-label={titulo}>
            {visibles.map((entrada) => (
              <Fila key={entrada.clave} entrada={entrada} vencido={seccion.grupo === 'vencido'} />
            ))}
          </ul>
          <Paginacion
            etiqueta={titulo}
            total={seccion.entradas.length}
            tamano={TAMANO_PAGINA}
            pagina={paginaActual}
            onCambiar={setPagina}
          />
        </div>
      ) : null}
    </Card>
  )
}

// Lo planificado de la actividad, por cuándo toca: qué está vencido, qué es
// hoy, qué viene. Quien organiza ve cuánto llevan entregado; quien
// participa, si ya lo hizo. Cada entrada lleva a donde se hace o se revisa.
export function PantallaOperacion() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const actividad = actividadQuery.data
  const organiza = actividad ? actividad.rol !== 'participante' : false
  const habilitados = new Set<ElementoConCalendario>(
    actividad
      ? [
          ...ELEMENTOS_ESPACIO_EQUIPO.filter((e) => estaHabilitada(actividad, e)),
          ...(bitacoraHabilitada(actividad.configuracion?.bitacora_individual)
            ? (['bitacora'] as const)
            : []),
        ]
      : [],
  )
  const calificacionHabilitada = actividad?.configuracion?.calificacion === 'habilitada'

  const periodosQuery = usePeriodos(id)
  const entregasQuery = useEntregasPorPeriodo(id, Boolean(actividad))
  const instrumentosOrganizaQuery = useAvanceDeInstrumentos(
    id,
    Boolean(actividad) && organiza && calificacionHabilitada,
  )
  const misInstrumentosQuery = useMisInstrumentos(
    id,
    Boolean(actividad) && !organiza && calificacionHabilitada,
  )

  const contexto = { idActividad: id, seccion: 'operacion' } as const
  const consultas = [
    actividadQuery,
    periodosQuery,
    entregasQuery,
    ...(calificacionHabilitada
      ? [organiza ? instrumentosOrganizaQuery : misInstrumentosQuery]
      : []),
  ]

  if (consultas.some((c) => c.isPending)) {
    return (
      <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contexto}>
        <div className={styles.cargando} role="status" aria-label="Cargando la agenda">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadQuery.isError || !actividad) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad no encontrada">
        <p className={styles.vacio}>No encontramos esta actividad, o ya no formas parte de ella.</p>
      </AppShell>
    )
  }

  const hoy = hoyEnCalendario()
  const fallo = consultas.find((c) => c.isError)
  const secciones = fallo
    ? []
    : construirAgenda({
        actividad,
        hoy,
        periodos: periodosQuery.data ?? [],
        entregas: entregasQuery.data ?? [],
        instrumentosOrganiza: instrumentosOrganizaQuery.data,
        misInstrumentos: misInstrumentosQuery.data,
        habilitados,
        calificacionHabilitada,
      })

  return (
    <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contexto} ayuda="operacion">
      <div className={styles.contenido}>
        {fallo ? (
          <AvisoError
            mensaje={
              fallo.error instanceof Error ? fallo.error.message : 'No pudimos cargar la agenda.'
            }
          />
        ) : secciones.length === 0 ? (
          <Card>
            <p className={styles.vacio}>Todavía no hay nada planificado con fecha.</p>
          </Card>
        ) : (
          secciones.map((seccion) => <Grupo key={seccion.grupo} seccion={seccion} hoy={hoy} />)
        )}
      </div>
    </AppShell>
  )
}
