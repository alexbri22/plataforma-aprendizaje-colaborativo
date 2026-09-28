import {
  ESTADOS_PERIODO,
  PERIODICIDADES,
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
