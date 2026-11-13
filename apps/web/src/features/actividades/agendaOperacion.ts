import type {
  AvanceDeInstrumento,
  ElementoConCalendario,
  EntregasDePeriodo,
  InstrumentoPorResponder,
  PeriodoReporte,
} from '@plataforma/shared'
import { sumarDias } from './formato'
import type { Actividad } from './tipos'

// Operación de la planeación: lo planificado de la actividad ordenado por
// cuándo toca, para saber qué está pendiente y qué viene. Función pura (sin
// fetch ni "hoy" implícito) para poder probarla sin renderizar.

export type GrupoAgenda = 'vencido' | 'hoy' | 'semana' | 'proximo' | 'sinFecha' | 'pasado'

export const ORDEN_GRUPOS: readonly GrupoAgenda[] = [
  'vencido',
  'hoy',
  'semana',
  'proximo',
  'sinFecha',
  'pasado',
]

export interface ProgresoAgenda {
  hechos: number
  total: number
  unidad: 'equipos' | 'participantes'
}

export interface EntradaAgenda {
  clave: string
  titulo: string
  /** El aspecto de un instrumento, por ejemplo. */
  detalle?: string
  /** Fechas de calendario (YYYY-MM-DD). Un día suelto tiene desde = hasta;
   * sin fecha, las dos son null. */
  desde: string | null
  hasta: string | null
  /** Para quien organiza: cuánto llevan entregado. */
  progreso?: ProgresoAgenda
  /** Para quien participa: si ya lo hizo. Sin valor en lo que no le toca
   * hacer (un hito de la actividad). */
  hecho?: boolean
  to?: string
}

export interface SeccionAgenda {
  grupo: GrupoAgenda
  entradas: EntradaAgenda[]
}

export interface DatosAgenda {
  actividad: Actividad
  /** Hoy en la zona horaria de quien mira (YYYY-MM-DD). */
  hoy: string
  /** Los periodos de todos los calendarios (cada elemento el suyo). */
  periodos: PeriodoReporte[]
  entregas: EntregasDePeriodo[]
  /** Solo quien organiza. */
  instrumentosOrganiza?: AvanceDeInstrumento[]
  /** Solo quien participa. */
  misInstrumentos?: InstrumentoPorResponder[]
  /** Los elementos habilitados: un calendario de algo deshabilitado no
   * aparece. */
  habilitados: ReadonlySet<ElementoConCalendario>
  calificacionHabilitada: boolean
}

const DIAS_DE_LA_SEMANA = 7

function completo(entrada: EntradaAgenda): boolean {
  if (entrada.hecho !== undefined) return entrada.hecho
  if (entrada.progreso)
    return entrada.progreso.total > 0 && entrada.progreso.hechos >= entrada.progreso.total
  // Un hito no se "hace": una vez pasado, ya pasó.
  return true
}

export function grupoDeEntrada(entrada: EntradaAgenda, hoy: string): GrupoAgenda {
  if (!entrada.desde || !entrada.hasta) return completo(entrada) ? 'pasado' : 'sinFecha'
  if (entrada.hasta < hoy) return completo(entrada) ? 'pasado' : 'vencido'
  if (entrada.desde <= hoy) return 'hoy'
  if (entrada.desde <= sumarDias(hoy, DIAS_DE_LA_SEMANA)) return 'semana'
  return 'proximo'
}

function entradasDeActividad(actividad: Actividad): EntradaAgenda[] {
  const entradas: EntradaAgenda[] = []
  const previaAlDesarrollo =
    actividad.fase === 'configuracion' ||
    actividad.fase === 'inscripcion' ||
    actividad.fase === 'formacion_equipos'
  if (actividad.fechaLimiteInscripcion && previaAlDesarrollo) {
    const dia = actividad.fechaLimiteInscripcion
    entradas.push({ clave: 'inscripcion', titulo: 'Cierra la inscripción', desde: dia, hasta: dia })
  }
  if (actividad.fechaInicio) {
    const dia = actividad.fechaInicio
    entradas.push({ clave: 'inicio', titulo: 'Empieza la actividad', desde: dia, hasta: dia })
  }
  if (actividad.fechaTermino) {
    const dia = actividad.fechaTermino
    entradas.push({ clave: 'termino', titulo: 'Termina la actividad', desde: dia, hasta: dia })
  }
  return entradas
}

const NOMBRE_EN_TITULO: Record<ElementoConCalendario, string> = {
  metas: 'metas',
  planeacion: 'planeación',
  avances: 'avances',
  recursos: 'materiales',
  producto: 'producto',
  bitacora: 'bitácora',
}

/** "Avance 3" o "Revisión de bitácora 2". */
export function tituloDePeriodo(periodo: PeriodoReporte): string {
  return periodo.elemento === 'avances'
    ? `Avance ${periodo.orden}`
    : `Revisión de ${NOMBRE_EN_TITULO[periodo.elemento]} ${periodo.orden}`
}

function entradasDePeriodos(datos: DatosAgenda, organiza: boolean): EntradaAgenda[] {
  const { actividad } = datos
  const porPeriodo = new Map(datos.entregas.map((e) => [e.idPeriodo, e]))
  const idMiEquipo = actividad.idMiEquipo ?? null
  return datos.periodos
    .filter((p) => p.estado === 'activo' && datos.habilitados.has(p.elemento))
    .map((periodo) => {
      const entregas = porPeriodo.get(periodo.id)
      const entrada: EntradaAgenda = {
        clave: `periodo-${periodo.id}`,
        titulo: tituloDePeriodo(periodo),
        desde: periodo.fechaInicio,
        hasta: periodo.fechaFin,
      }
      if (organiza) {
        entrada.progreso = {
          hechos: entregas?.hechos ?? 0,
          total: entregas?.total ?? 0,
          unidad:
            entregas?.unidad ?? (periodo.elemento === 'bitacora' ? 'participantes' : 'equipos'),
        }
        entrada.to = `/actividades/${actividad.id}/equipos`
      } else if (idMiEquipo) {
        entrada.hecho = entregas?.mio ?? false
        entrada.to = `/equipos/${idMiEquipo}/${periodo.elemento}`
      }
      return entrada
    })
}

function entradasDeInstrumentos(datos: DatosAgenda, organiza: boolean): EntradaAgenda[] {
  const { actividad } = datos
  if (organiza) {
    return (datos.instrumentosOrganiza ?? []).map((i) => ({
      clave: `instrumento-${i.id}`,
      titulo: i.nombre,
      detalle: i.aspecto.nombre,
      desde: i.fechaPlanificada,
      hasta: i.fechaPlanificada,
      progreso: { hechos: i.completados, total: i.total, unidad: 'participantes' },
      to: datos.calificacionHabilitada ? `/actividades/${actividad.id}/calificaciones` : undefined,
    }))
  }
  const idMiEquipo = actividad.idMiEquipo ?? null
  return (datos.misInstrumentos ?? []).map((i) => ({
    clave: `instrumento-${i.id}`,
    titulo: i.nombre,
    detalle: i.aspecto.nombre,
    desde: i.fechaPlanificada,
    hasta: i.fechaPlanificada,
    hecho: i.completadoEn !== null,
    to: idMiEquipo ? `/equipos/${idMiEquipo}/proceso/${i.aspecto.clave}/${i.id}` : undefined,
  }))
}

/** Las entradas agrupadas por cuándo tocan, en el orden en que se leen;
 * sin grupos vacíos. Dentro de cada grupo, por fecha. */
export function construirAgenda(datos: DatosAgenda): SeccionAgenda[] {
  const organiza = datos.actividad.rol !== 'participante'
  const todas = [
    ...entradasDeActividad(datos.actividad),
    ...entradasDePeriodos(datos, organiza),
    ...entradasDeInstrumentos(datos, organiza),
  ]
  const porGrupo = new Map<GrupoAgenda, EntradaAgenda[]>()
  for (const entrada of todas) {
    const grupo = grupoDeEntrada(entrada, datos.hoy)
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), entrada])
  }
  return ORDEN_GRUPOS.filter((g) => porGrupo.has(g)).map((grupo) => {
    const entradas = [...porGrupo.get(grupo)!].sort((a, b) =>
      (a.desde ?? '').localeCompare(b.desde ?? ''),
    )
    // Lo que ya pasó se lee de lo más reciente a lo más antiguo.
    return { grupo, entradas: grupo === 'pasado' ? entradas.reverse() : entradas }
  })
}

/** Hoy como fecha de calendario local (YYYY-MM-DD), sin pasar por UTC. */
export function hoyEnCalendario(ahora: Date = new Date()): string {
  const dosDigitos = (n: number) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`
}
