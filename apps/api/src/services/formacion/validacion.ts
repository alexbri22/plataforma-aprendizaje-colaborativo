import {
  DURACION_MAXIMA_RECURSO_MIN,
  POR_PAGINA_MAXIMA,
  LARGO_MAXIMO_RECURSO,
  esAreaHabilidad,
  esElementoColaboracion,
  esEstatusRecurso,
  esSeccionFormativa,
  esTipoRecurso,
  type AreaHabilidad,
  type ElementoColaboracion,
  type EstatusRecurso,
  type SeccionFormativa,
  type TipoRecurso,
} from '@plataforma/shared'
import { ErrorValidacion } from '../../errores.js'

/*
 * Forma de los datos de un recurso (docs/diseno-desarrollo-formacion.md §6.2).
 * Aquí solo se revisa que cada campo que llega tenga la forma correcta; las
 * reglas que cruzan campos (URL según el tipo, mínimos de publicación) las
 * aplica el servicio sobre el recurso ya combinado, porque en una edición
 * parcial el tipo o el estatus pueden no venir en el cuerpo.
 */

export interface DatosRecurso {
  seccion: SeccionFormativa
  titulo: string
  resumen: string
  tipoRecurso: TipoRecurso
  contenido: string
  transcripcion: string
  area: AreaHabilidad | null
  elementos: ElementoColaboracion[]
  duracionMin: number | null
  fuente: string
  licencia: string
  orden: number
  estatus: EstatusRecurso
}

export interface FiltrosRecursos {
  seccion?: SeccionFormativa
  area?: AreaHabilidad
  /** Uno o varios tipos (?tipo=pdf,plantilla): el catálogo público pide los
   * artículos por un lado y los recursos breves por otro. */
  tiposRecurso?: TipoRecurso[]
  texto?: string
}

export interface PeticionPagina {
  pagina: number
  porPagina: number
}

type CampoTexto = keyof typeof LARGO_MAXIMO_RECURSO

function texto(
  datos: Record<string, unknown>,
  campo: CampoTexto,
  detalle: Record<string, string>,
): string | undefined {
  const valor = datos[campo]
  if (valor === undefined) return undefined
  if (typeof valor !== 'string') {
    detalle[campo] = 'Debe ser texto.'
    return undefined
  }
  const limpio = valor.trim()
  if (limpio.length > LARGO_MAXIMO_RECURSO[campo]) {
    detalle[campo] = `No puede pasar de ${LARGO_MAXIMO_RECURSO[campo]} caracteres.`
    return undefined
  }
  return limpio
}

/**
 * Valida el cuerpo de un alta (`parcial = false`: sección, título y tipo
 * obligatorios) o de una edición (`parcial = true`: todo opcional, pero lo que
 * llega debe ser válido). Devuelve solo los campos presentes.
 */
export function validarDatosRecurso(cuerpo: unknown, parcial: boolean): Partial<DatosRecurso> {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const detalle: Record<string, string> = {}
  const resultado: Partial<DatosRecurso> = {}

  if (datos.seccion !== undefined || !parcial) {
    if (typeof datos.seccion === 'string' && esSeccionFormativa(datos.seccion)) {
      resultado.seccion = datos.seccion
    } else {
      detalle.seccion = 'Elige una sección válida.'
    }
  }

  if (datos.tipoRecurso !== undefined || !parcial) {
    if (typeof datos.tipoRecurso === 'string' && esTipoRecurso(datos.tipoRecurso)) {
      resultado.tipoRecurso = datos.tipoRecurso
    } else {
      detalle.tipoRecurso = 'Elige un tipo de recurso válido.'
    }
  }

  const titulo = texto(datos, 'titulo', detalle)
  if (titulo !== undefined) {
    if (titulo) resultado.titulo = titulo
    else detalle.titulo = 'El título es requerido.'
  } else if (!parcial && !detalle.titulo) {
    detalle.titulo = 'El título es requerido.'
  }

  for (const campo of ['resumen', 'contenido', 'transcripcion', 'fuente', 'licencia'] as const) {
    const valor = texto(datos, campo, detalle)
    if (valor !== undefined) resultado[campo] = valor
  }

  if (datos.area !== undefined) {
    if (datos.area === null || datos.area === '') resultado.area = null
    else if (typeof datos.area === 'string' && esAreaHabilidad(datos.area)) {
      resultado.area = datos.area
    } else detalle.area = 'Elige un área válida.'
  }

  if (datos.elementos !== undefined) {
    if (
      Array.isArray(datos.elementos) &&
      datos.elementos.every((e) => typeof e === 'string' && esElementoColaboracion(e))
    ) {
      // Sin duplicados, en el orden en que llegaron.
      resultado.elementos = [...new Set(datos.elementos as ElementoColaboracion[])]
    } else {
      detalle.elementos = 'Los elementos no son válidos.'
    }
  }

  if (datos.duracionMin !== undefined) {
    const n = datos.duracionMin
    if (n === null || n === '') resultado.duracionMin = null
    else if (
      typeof n === 'number' &&
      Number.isInteger(n) &&
      n > 0 &&
      n <= DURACION_MAXIMA_RECURSO_MIN
    ) {
      resultado.duracionMin = n
    } else {
      detalle.duracionMin = `La duración debe ser un número entero entre 1 y ${DURACION_MAXIMA_RECURSO_MIN} minutos.`
    }
  }

  if (datos.orden !== undefined) {
    const n = datos.orden
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0) resultado.orden = n
    else detalle.orden = 'El orden debe ser un entero mayor o igual a cero.'
  }

  if (datos.estatus !== undefined) {
    if (typeof datos.estatus === 'string' && esEstatusRecurso(datos.estatus)) {
      resultado.estatus = datos.estatus
    } else {
      detalle.estatus = 'El estatus no es válido.'
    }
  }

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
  return resultado
}

/** Filtros del catálogo público. Un valor desconocido es un error y no se
 * ignora: un filtro ignorado en silencio devolvería de más. */
export function validarFiltrosRecursos(query: Record<string, unknown>): FiltrosRecursos {
  const detalle: Record<string, string> = {}
  const filtros: FiltrosRecursos = {}
  const { seccion, area, tipo, q } = query

  if (typeof seccion === 'string' && seccion) {
    if (esSeccionFormativa(seccion)) filtros.seccion = seccion
    else detalle.seccion = 'Sección desconocida.'
  }
  if (typeof area === 'string' && area) {
    if (esAreaHabilidad(area)) filtros.area = area
    else detalle.area = 'Área desconocida.'
  }
  if (typeof tipo === 'string' && tipo) {
    const tipos = [...new Set(tipo.split(',').map((t) => t.trim()))]
    if (tipos.every(esTipoRecurso)) filtros.tiposRecurso = tipos
    else detalle.tipo = 'Tipo desconocido.'
  }
  if (typeof q === 'string' && q.trim()) filtros.texto = q.trim().slice(0, 100)

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
  return filtros
}

function enteroPositivo(valor: unknown): number | undefined {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return undefined
  const n = Number(valor)
  return n >= 1 ? n : undefined
}

/** ?pagina y ?porPagina. Ambos opcionales; si llegan, deben ser enteros
 * positivos y porPagina no pasa del máximo. Una página posterior a la última
 * no es error: devuelve la lista vacía con el total, y el cliente decide. */
export function validarPaginacion(
  query: Record<string, unknown>,
  porPaginaPorDefecto: number,
): PeticionPagina {
  const detalle: Record<string, string> = {}
  let pagina = 1
  let porPagina = porPaginaPorDefecto

  if (query.pagina !== undefined) {
    const n = enteroPositivo(query.pagina)
    if (n === undefined) detalle.pagina = 'La página debe ser un entero mayor o igual a 1.'
    else pagina = n
  }
  if (query.porPagina !== undefined) {
    const n = enteroPositivo(query.porPagina)
    if (n === undefined || n > POR_PAGINA_MAXIMA) {
      detalle.porPagina = `porPagina debe ser un entero entre 1 y ${POR_PAGINA_MAXIMA}.`
    } else porPagina = n
  }

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
  return { pagina, porPagina }
}
