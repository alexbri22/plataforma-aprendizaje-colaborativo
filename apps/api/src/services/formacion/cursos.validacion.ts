import {
  DURACION_MAXIMA_RECURSO_MIN,
  LARGO_MAXIMO_CURSO,
  LARGO_MAXIMO_LECCION,
  esAreaHabilidad,
  esElementoColaboracion,
  esEstatusRecurso,
  esNivelCurso,
  esTipoLeccion,
  type AreaHabilidad,
  type ElementoColaboracion,
  type EstatusCurso,
  type NivelCurso,
  type TipoLeccion,
} from '@plataforma/shared'
import { ErrorValidacion } from '../../errores.js'

/*
 * Forma de los datos de un curso y de sus lecciones
 * (docs/diseno-desarrollo-formacion.md §2.4 y §5). Igual que en recursos, aquí
 * solo se revisa que cada campo que llega tenga la forma correcta; las reglas
 * que cruzan campos o lecciones (mínimos de publicación, recurso existente)
 * las aplica cursos.service.ts sobre el curso ya combinado.
 */

export interface DatosCurso {
  titulo: string
  resumen: string
  objetivo: string
  area: AreaHabilidad | null
  elementos: ElementoColaboracion[]
  nivel: NivelCurso | null
  practicaFinal: string
  orden: number
  estatus: EstatusCurso
}

export interface FiltrosCursos {
  area?: AreaHabilidad
  nivel?: NivelCurso
  elemento?: ElementoColaboracion
  texto?: string
}

export interface DatosLeccion {
  titulo: string
  tipo: TipoLeccion
  idRecurso: string | null
  contenido: string
  obligatoria: boolean
  duracionMin: number | null
}

type Detalle = Record<string, string>

function texto(
  datos: Record<string, unknown>,
  campo: string,
  maximo: number,
  detalle: Detalle,
): string | undefined {
  const valor = datos[campo]
  if (valor === undefined) return undefined
  if (typeof valor !== 'string') {
    detalle[campo] = 'Debe ser texto.'
    return undefined
  }
  const limpio = valor.trim()
  if (limpio.length > maximo) {
    detalle[campo] = `No puede pasar de ${maximo} caracteres.`
    return undefined
  }
  return limpio
}

function duracion(valor: unknown, detalle: Detalle): number | null | undefined {
  if (valor === undefined) return undefined
  if (valor === null || valor === '') return null
  if (
    typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor > 0 &&
    valor <= DURACION_MAXIMA_RECURSO_MIN
  ) {
    return valor
  }
  detalle.duracionMin = `La duración debe ser un número entero entre 1 y ${DURACION_MAXIMA_RECURSO_MIN} minutos.`
  return undefined
}

/** Alta (`parcial = false`: título obligatorio) o edición de la ficha. */
export function validarDatosCurso(cuerpo: unknown, parcial: boolean): Partial<DatosCurso> {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const detalle: Detalle = {}
  const resultado: Partial<DatosCurso> = {}

  const titulo = texto(datos, 'titulo', LARGO_MAXIMO_CURSO.titulo, detalle)
  if (titulo) resultado.titulo = titulo
  else if (!detalle.titulo && (titulo !== undefined || !parcial)) {
    detalle.titulo = 'El título es requerido.'
  }

  for (const campo of ['resumen', 'objetivo', 'practicaFinal'] as const) {
    const valor = texto(datos, campo, LARGO_MAXIMO_CURSO[campo], detalle)
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
      resultado.elementos = [...new Set(datos.elementos as ElementoColaboracion[])]
    } else {
      detalle.elementos = 'Los elementos no son válidos.'
    }
  }

  if (datos.nivel !== undefined) {
    if (datos.nivel === null || datos.nivel === '') resultado.nivel = null
    else if (typeof datos.nivel === 'string' && esNivelCurso(datos.nivel)) {
      resultado.nivel = datos.nivel
    } else detalle.nivel = 'Elige un nivel válido.'
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

/** Alta (`parcial = false`: tipo obligatorio) o edición de una lección. */
export function validarDatosLeccion(cuerpo: unknown, parcial: boolean): Partial<DatosLeccion> {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const detalle: Detalle = {}
  const resultado: Partial<DatosLeccion> = {}

  if (datos.tipo !== undefined || !parcial) {
    if (typeof datos.tipo === 'string' && esTipoLeccion(datos.tipo)) resultado.tipo = datos.tipo
    else detalle.tipo = 'Elige un tipo de lección válido.'
  }

  const titulo = texto(datos, 'titulo', LARGO_MAXIMO_LECCION.titulo, detalle)
  if (titulo !== undefined) resultado.titulo = titulo

  const contenido = texto(datos, 'contenido', LARGO_MAXIMO_LECCION.contenido, detalle)
  if (contenido !== undefined) resultado.contenido = contenido

  if (datos.idRecurso !== undefined) {
    if (datos.idRecurso === null || datos.idRecurso === '') resultado.idRecurso = null
    else if (typeof datos.idRecurso === 'string') resultado.idRecurso = datos.idRecurso
    else detalle.idRecurso = 'El recurso no es válido.'
  }

  if (datos.obligatoria !== undefined) {
    if (typeof datos.obligatoria === 'boolean') resultado.obligatoria = datos.obligatoria
    else detalle.obligatoria = 'Indica si la lección es obligatoria.'
  }

  const minutos = duracion(datos.duracionMin, detalle)
  if (minutos !== undefined) resultado.duracionMin = minutos

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
  return resultado
}

/** Cuerpo de PUT .../lecciones/orden: la lista completa de ids en el orden
 * nuevo. Que sea exactamente el conjunto de lecciones del curso lo comprueba
 * el servicio. */
export function validarOrdenLecciones(cuerpo: unknown): string[] {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const lista = datos.lecciones
  if (
    !Array.isArray(lista) ||
    !lista.every((id) => typeof id === 'string') ||
    new Set(lista).size !== lista.length
  ) {
    throw new ErrorValidacion({
      lecciones: 'Se espera la lista de ids de las lecciones, sin repetir.',
    })
  }
  return lista as string[]
}

/** Filtros del catálogo público. Como en recursos, un valor desconocido es un
 * error: un filtro ignorado en silencio devolvería de más. */
export function validarFiltrosCursos(query: Record<string, unknown>): FiltrosCursos {
  const detalle: Detalle = {}
  const filtros: FiltrosCursos = {}
  const { area, nivel, elemento, q } = query

  if (typeof area === 'string' && area) {
    if (esAreaHabilidad(area)) filtros.area = area
    else detalle.area = 'Área desconocida.'
  }
  if (typeof nivel === 'string' && nivel) {
    if (esNivelCurso(nivel)) filtros.nivel = nivel
    else detalle.nivel = 'Nivel desconocido.'
  }
  if (typeof elemento === 'string' && elemento) {
    if (esElementoColaboracion(elemento)) filtros.elemento = elemento
    else detalle.elemento = 'Elemento desconocido.'
  }
  if (typeof q === 'string' && q.trim()) filtros.texto = q.trim().slice(0, 100)

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
  return filtros
}
