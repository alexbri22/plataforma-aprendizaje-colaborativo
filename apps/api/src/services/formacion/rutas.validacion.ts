import {
  LARGO_MAXIMO_RUTA,
  MAX_CURSOS_RUTA,
  esEstatusRecurso,
  type EstatusRecurso,
} from '@plataforma/shared'
import { ErrorValidacion } from '../../errores.js'

/*
 * Forma de los datos de una ruta de aprendizaje. Igual que en cursos, aquí
 * solo se revisa la forma de cada campo; los mínimos de publicación y que los
 * cursos existan los comprueba rutas.service.ts.
 */

export interface DatosRuta {
  titulo: string
  finalidad: string
  descripcion: string
  orden: number
  estatus: EstatusRecurso
  destacada: boolean
}

type Detalle = Record<string, string>

function texto(
  datos: Record<string, unknown>,
  campo: keyof typeof LARGO_MAXIMO_RUTA,
  detalle: Detalle,
): string | undefined {
  const valor = datos[campo]
  if (valor === undefined) return undefined
  if (typeof valor !== 'string') {
    detalle[campo] = 'Debe ser texto.'
    return undefined
  }
  const limpio = valor.trim()
  if (limpio.length > LARGO_MAXIMO_RUTA[campo]) {
    detalle[campo] = `No puede pasar de ${LARGO_MAXIMO_RUTA[campo]} caracteres.`
    return undefined
  }
  return limpio
}

/** Alta (`parcial = false`: título obligatorio) o edición de la ficha. */
export function validarDatosRuta(cuerpo: unknown, parcial: boolean): Partial<DatosRuta> {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const detalle: Detalle = {}
  const resultado: Partial<DatosRuta> = {}

  const titulo = texto(datos, 'titulo', detalle)
  if (titulo) resultado.titulo = titulo
  else if (!detalle.titulo && (titulo !== undefined || !parcial)) {
    detalle.titulo = 'El título es requerido.'
  }

  for (const campo of ['finalidad', 'descripcion'] as const) {
    const valor = texto(datos, campo, detalle)
    if (valor !== undefined) resultado[campo] = valor
  }

  if (datos.orden !== undefined) {
    const n = datos.orden
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0) resultado.orden = n
    else detalle.orden = 'El orden debe ser un entero mayor o igual a cero.'
  }

  if (datos.estatus !== undefined) {
    if (typeof datos.estatus === 'string' && esEstatusRecurso(datos.estatus)) {
      resultado.estatus = datos.estatus
    } else detalle.estatus = 'El estatus no es válido.'
  }

  if (datos.destacada !== undefined) {
    if (typeof datos.destacada === 'boolean') resultado.destacada = datos.destacada
    else detalle.destacada = 'Indica si la ruta es la destacada.'
  }

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
  return resultado
}

/** Cuerpo de PUT .../cursos: la lista completa de cursos de la ruta, en
 * orden y sin repetir. Que existan lo comprueba el servicio. */
export function validarCursosRuta(cuerpo: unknown): string[] {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const lista = datos.cursos
  if (
    !Array.isArray(lista) ||
    !lista.every((id) => typeof id === 'string' && id !== '') ||
    new Set(lista).size !== lista.length
  ) {
    throw new ErrorValidacion({ cursos: 'Se espera la lista de ids de los cursos, sin repetir.' })
  }
  if (lista.length > MAX_CURSOS_RUTA) {
    throw new ErrorValidacion({
      cursos: `Una ruta tiene como máximo ${MAX_CURSOS_RUTA} cursos.`,
    })
  }
  return lista as string[]
}
