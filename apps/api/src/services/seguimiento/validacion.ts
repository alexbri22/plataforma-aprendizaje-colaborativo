import {
  ELEMENTOS_ESPACIO_EQUIPO,
  ESTADOS_PERIODO,
  LONGITUD_MAXIMA_CONTENIDO_BITACORA,
  LONGITUD_MAXIMA_CONTENIDO_COMENTARIO,
  LONGITUD_MAXIMA_CONTENIDO_ELEMENTO,
  PERIODICIDADES,
  type ElementoEspacioEquipo,
  type EstadoPeriodo,
  type Periodicidad,
} from '@plataforma/shared'
import { ErrorValidacion } from '../../errores.js'
import { parsearFechaCalendario } from '../../utilidades/fechas.js'

// Mock manual sin paquete de validación compartido todavía (mismo criterio
// que services/actividades/validacion.ts).

function comoObjeto(cuerpo: unknown): Record<string, unknown> {
  return (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
}

// 'ninguna' borra el calendario; las demás lo regeneran (nucleo §9.2, P-28).
export type PeriodicidadSolicitada = Periodicidad | 'ninguna'

export function validarDatosDefinirPeriodos(cuerpo: unknown): {
  periodicidad: PeriodicidadSolicitada
} {
  const { periodicidad } = comoObjeto(cuerpo)
  const validas: readonly string[] = [...PERIODICIDADES, 'ninguna']

  if (typeof periodicidad === 'string' && validas.includes(periodicidad)) {
    return { periodicidad: periodicidad as PeriodicidadSolicitada }
  }
  throw new ErrorValidacion({ periodicidad: `Debe ser uno de: ${validas.join(', ')}.` })
}

export interface CambiosPeriodo {
  fechaInicio?: Date
  fechaFin?: Date
  estado?: EstadoPeriodo
}

// PATCH: todos los campos son opcionales, pero debe llegar al menos uno.
// Una fecha o un estado presentes e inválidos se rechazan; no se ignoran en
// silencio, porque el cliente creería que el cambio se guardó.
export function validarDatosActualizarPeriodo(cuerpo: unknown): CambiosPeriodo {
  const datos = comoObjeto(cuerpo)
  const detallePorCampo: Record<string, string> = {}
  const cambios: CambiosPeriodo = {}

  for (const campo of ['fechaInicio', 'fechaFin'] as const) {
    if (datos[campo] === undefined) continue
    const parseada = parsearFechaCalendario(datos[campo])
    if (parseada) cambios[campo] = parseada
    else detallePorCampo[campo] = 'Debe ser una fecha con formato AAAA-MM-DD.'
  }

  if (datos.estado !== undefined) {
    if (
      typeof datos.estado === 'string' &&
      (ESTADOS_PERIODO as readonly string[]).includes(datos.estado)
    ) {
      cambios.estado = datos.estado as EstadoPeriodo
    } else {
      detallePorCampo.estado = `Debe ser uno de: ${ESTADOS_PERIODO.join(', ')}.`
    }
  }

  if (Object.keys(detallePorCampo).length === 0 && Object.keys(cambios).length === 0) {
    throw new ErrorValidacion({
      cuerpo: 'Indica al menos un cambio: fechaInicio, fechaFin o estado.',
    })
  }
  if (Object.keys(detallePorCampo).length > 0) throw new ErrorValidacion(detallePorCampo)

  return cambios
}

// Espacio de equipo (nucleo §9.1): metas, avances y recursos.

function validarContenido(valor: unknown): { contenido: string } | { error: string } {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { error: 'Escribe el contenido del elemento.' }
  }
  const contenido = valor.trim()
  if (contenido.length > LONGITUD_MAXIMA_CONTENIDO_ELEMENTO) {
    return { error: `Debe tener a lo más ${LONGITUD_MAXIMA_CONTENIDO_ELEMENTO} caracteres.` }
  }
  return { contenido }
}

export function validarDatosCrearElemento(cuerpo: unknown): {
  tipo: ElementoEspacioEquipo
  contenido: string
} {
  const datos = comoObjeto(cuerpo)
  const detallePorCampo: Record<string, string> = {}
  let contenido = ''

  if (
    typeof datos.tipo !== 'string' ||
    !(ELEMENTOS_ESPACIO_EQUIPO as readonly string[]).includes(datos.tipo)
  ) {
    detallePorCampo.tipo = `Debe ser uno de: ${ELEMENTOS_ESPACIO_EQUIPO.join(', ')}.`
  }

  const resultado = validarContenido(datos.contenido)
  if ('error' in resultado) detallePorCampo.contenido = resultado.error
  else contenido = resultado.contenido

  if (Object.keys(detallePorCampo).length > 0) throw new ErrorValidacion(detallePorCampo)
  return { tipo: datos.tipo as ElementoEspacioEquipo, contenido }
}

export function validarDatosActualizarElemento(cuerpo: unknown): { contenido: string } {
  const resultado = validarContenido(comoObjeto(cuerpo).contenido)
  if ('error' in resultado) throw new ErrorValidacion({ contenido: resultado.error })
  return resultado
}

// Bitácora individual (nucleo §9.3).

function validarContenidoConLimite(
  valor: unknown,
  limite: number,
  mensajeVacio: string,
): { contenido: string } | { error: string } {
  if (typeof valor !== 'string' || valor.trim() === '') return { error: mensajeVacio }
  const contenido = valor.trim()
  if (contenido.length > limite) {
    return { error: `Debe tener a lo más ${limite} caracteres.` }
  }
  return { contenido }
}

export function validarDatosEntradaBitacora(cuerpo: unknown): { contenido: string } {
  const resultado = validarContenidoConLimite(
    comoObjeto(cuerpo).contenido,
    LONGITUD_MAXIMA_CONTENIDO_BITACORA,
    'Escribe el contenido de la entrada.',
  )
  if ('error' in resultado) throw new ErrorValidacion({ contenido: resultado.error })
  return resultado
}

// Comentarios (nucleo §10.4): mismo cuerpo para crear y editar, sobre un
// elemento o sobre una entrada de bitácora.

export function validarDatosComentario(cuerpo: unknown): { contenido: string } {
  const resultado = validarContenidoConLimite(
    comoObjeto(cuerpo).contenido,
    LONGITUD_MAXIMA_CONTENIDO_COMENTARIO,
    'Escribe el contenido del comentario.',
  )
  if ('error' in resultado) throw new ErrorValidacion({ contenido: resultado.error })
  return resultado
}
