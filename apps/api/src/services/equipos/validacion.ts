import {
  LONGITUD_MAXIMA_NOMBRE_EQUIPO,
  LONGITUD_MAXIMA_TEXTO_EQUIPO,
  SEMILLA_MAXIMA,
} from '@plataforma/shared'
import { ErrorValidacion } from '../../errores.js'

// Mock manual sin paquete de validación compartido todavía (mismo criterio
// que services/actividades/validacion.ts y services/seguimiento/validacion.ts).

function comoObjeto(cuerpo: unknown): Record<string, unknown> {
  return (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
}

// Devuelve el nombre recortado, o el mensaje de por qué no vale.
function validarNombre(valor: unknown): { nombre: string } | { error: string } {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { error: 'Escribe un nombre para el equipo.' }
  }
  const nombre = valor.trim()
  if (nombre.length > LONGITUD_MAXIMA_NOMBRE_EQUIPO) {
    return { error: `Debe tener a lo más ${LONGITUD_MAXIMA_NOMBRE_EQUIPO} caracteres.` }
  }
  return { nombre }
}

export function validarDatosCrearEquipo(cuerpo: unknown): { nombre: string } {
  const resultado = validarNombre(comoObjeto(cuerpo).nombre)
  if ('error' in resultado) throw new ErrorValidacion({ nombre: resultado.error })
  return resultado
}

export interface CambiosEquipo {
  nombre?: string
  descripcionActividad?: string | null
  formaDeTrabajo?: string | null
}

// Texto libre que llena el propio equipo: la cadena vacía o null lo borra.
function validarTextoOpcional(valor: unknown): { texto: string | null } | { error: string } {
  if (valor === null) return { texto: null }
  if (typeof valor !== 'string') return { error: 'Debe ser texto.' }
  const texto = valor.trim()
  if (texto.length > LONGITUD_MAXIMA_TEXTO_EQUIPO) {
    return { error: `Debe tener a lo más ${LONGITUD_MAXIMA_TEXTO_EQUIPO} caracteres.` }
  }
  return { texto: texto === '' ? null : texto }
}

// PATCH: todos los campos son opcionales, pero debe llegar al menos uno. Un
// campo presente e inválido se rechaza en lugar de ignorarse en silencio.
export function validarDatosActualizarEquipo(cuerpo: unknown): CambiosEquipo {
  const datos = comoObjeto(cuerpo)
  const detallePorCampo: Record<string, string> = {}
  const cambios: CambiosEquipo = {}

  if (datos.nombre !== undefined) {
    const resultado = validarNombre(datos.nombre)
    if ('error' in resultado) detallePorCampo.nombre = resultado.error
    else cambios.nombre = resultado.nombre
  }
  for (const campo of ['descripcionActividad', 'formaDeTrabajo'] as const) {
    if (datos[campo] === undefined) continue
    const resultado = validarTextoOpcional(datos[campo])
    if ('error' in resultado) detallePorCampo[campo] = resultado.error
    else cambios[campo] = resultado.texto
  }

  if (Object.keys(detallePorCampo).length > 0) throw new ErrorValidacion(detallePorCampo)
  if (Object.keys(cambios).length === 0) {
    throw new ErrorValidacion({
      cuerpo: 'Indica al menos un cambio: nombre, descripcionActividad o formaDeTrabajo.',
    })
  }
  return cambios
}

// POST propuesta: el cuerpo es opcional. `semilla` permite reproducir una
// propuesta anterior (la guarda el evento del historial); sin ella, el
// servidor elige una.
export function validarDatosGenerarPropuesta(cuerpo: unknown): { semilla?: number } {
  const { semilla } = comoObjeto(cuerpo)
  if (semilla === undefined) return {}
  if (
    typeof semilla === 'number' &&
    Number.isInteger(semilla) &&
    semilla >= 0 &&
    semilla <= SEMILLA_MAXIMA
  ) {
    return { semilla }
  }
  throw new ErrorValidacion({
    semilla: `Debe ser un entero entre 0 y ${SEMILLA_MAXIMA}.`,
  })
}

// POST intercambio: dos membresías distintas.
export function validarDatosIntercambio(cuerpo: unknown): {
  idMembresiaA: string
  idMembresiaB: string
} {
  const { idMembresiaA, idMembresiaB } = comoObjeto(cuerpo)
  const detallePorCampo: Record<string, string> = {}
  for (const [campo, valor] of [
    ['idMembresiaA', idMembresiaA],
    ['idMembresiaB', idMembresiaB],
  ] as const) {
    if (typeof valor !== 'string' || valor.trim() === '') detallePorCampo[campo] = 'Es obligatorio.'
  }
  if (Object.keys(detallePorCampo).length > 0) throw new ErrorValidacion(detallePorCampo)
  return { idMembresiaA: idMembresiaA as string, idMembresiaB: idMembresiaB as string }
}
