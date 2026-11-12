import {
  LONGITUD_MAXIMA_CONTENIDO_ENTREGA,
  LONGITUD_MAXIMA_ENLACE_ELEMENTO,
  ORIGENES_INSTRUMENTO,
  PERIODICIDADES,
  TIPOS_INSTRUMENTO,
  esUrlSegura,
  type OrigenInstrumento,
  type TipoInstrumento,
} from '@plataforma/shared'
import { ErrorValidacion } from '../../errores.js'
import { parsearFechaCalendario } from '../../utilidades/fechas.js'
import type { PeriodicidadSolicitada } from '../seguimiento/validacion.js'

// Validación de forma de las peticiones de Evaluación. Las reglas que
// dependen de datos (que cada nivel sume 100 sobre la estructura real, que el
// aspecto admita la plantilla) las verifica el servicio.

function comoObjeto(cuerpo: unknown): Record<string, unknown> {
  return (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
}

// El peso de una parte: entero de 0 a 100 (general §4.6). Que su nivel sume
// 100 no se exige al guardar uno solo: ver cambiarPeso.
export function validarDatosPeso(cuerpo: unknown): { peso: number } {
  const { peso } = comoObjeto(cuerpo)
  if (typeof peso !== 'number' || !Number.isInteger(peso) || peso < 0 || peso > 100) {
    throw new ErrorValidacion({ peso: 'Debe ser un entero de 0 a 100.' })
  }
  return { peso }
}

/** El instrumento de un aspecto del proceso (nucleo §10.1): ninguno (tipo
 * nulo), o un tipo con la periodicidad que genera sus instancias. El formato
 * se elige por instancia (CambiosInstrumento). Que el aspecto admita el tipo
 * lo verifica el servicio. */
export type DefinicionInstrumentos =
  { tipo: null } | { tipo: TipoInstrumento; periodicidad: PeriodicidadSolicitada }

export function validarDatosInstrumentos(cuerpo: unknown): DefinicionInstrumentos {
  const { tipo, periodicidad } = comoObjeto(cuerpo)
  if (tipo === null) return { tipo: null }

  const errores: Record<string, string> = {}
  if (!(TIPOS_INSTRUMENTO as readonly unknown[]).includes(tipo)) {
    errores.tipo = 'No es un tipo de instrumento del catálogo.'
  }
  const periodicidades: readonly unknown[] = [...PERIODICIDADES, 'ninguna']
  if (!periodicidades.includes(periodicidad)) {
    errores.periodicidad = `Debe ser una de: ${periodicidades.join(', ')}.`
  }
  if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores)

  return { tipo: tipo as TipoInstrumento, periodicidad: periodicidad as PeriodicidadSolicitada }
}

/** Lo que se ajusta de una instancia; lo ausente no cambia. enlace null lo
 * quita; fechaPlanificada null la quita. */
export interface CambiosInstrumento {
  formato?: OrigenInstrumento
  enlace?: string | null
  fechaPlanificada?: Date | null
}

export function validarDatosInstrumento(cuerpo: unknown): CambiosInstrumento {
  const { formato, enlace, fechaPlanificada } = comoObjeto(cuerpo)
  const errores: Record<string, string> = {}
  const cambios: CambiosInstrumento = {}

  if (formato !== undefined) {
    if ((ORIGENES_INSTRUMENTO as readonly unknown[]).includes(formato)) {
      cambios.formato = formato as OrigenInstrumento
    } else errores.formato = 'Debe ser plantilla o enlace.'
  }
  if (enlace !== undefined) {
    const limpio = typeof enlace === 'string' ? enlace.trim() : ''
    if (enlace === null || limpio === '') cambios.enlace = null
    else if (!esUrlSegura(limpio) || limpio.length > 2048) {
      errores.enlace = 'Debe ser un enlace completo que empiece con https://'
    } else cambios.enlace = limpio
  }
  if (fechaPlanificada !== undefined) {
    if (fechaPlanificada === null) cambios.fechaPlanificada = null
    else {
      const fecha = parsearFechaCalendario(fechaPlanificada)
      if (fecha) cambios.fechaPlanificada = fecha
      else errores.fechaPlanificada = 'Debe ser una fecha AAAA-MM-DD.'
    }
  }
  if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores)
  return cambios
}

// La entrega de una actividad externa (nucleo §10.1): una nota obligatoria
// y un enlace https opcional, como un avance. El archivo viaja aparte.
export function validarDatosEntrega(cuerpo: unknown): { contenido: string; enlace: string | null } {
  const { contenido, enlace } = comoObjeto(cuerpo)
  const errores: Record<string, string> = {}
  if (typeof contenido !== 'string' || contenido.trim() === '') {
    errores.contenido = 'Cuenta brevemente qué hiciste.'
  } else if (contenido.trim().length > LONGITUD_MAXIMA_CONTENIDO_ENTREGA) {
    errores.contenido = `Debe tener a lo más ${LONGITUD_MAXIMA_CONTENIDO_ENTREGA} caracteres.`
  }
  let enlaceValido: string | null = null
  if (enlace !== undefined && enlace !== null && enlace !== '') {
    if (
      typeof enlace !== 'string' ||
      enlace.trim().length > LONGITUD_MAXIMA_ENLACE_ELEMENTO ||
      !esUrlSegura(enlace.trim())
    ) {
      errores.enlace = 'Debe ser un enlace que empiece con https://.'
    } else enlaceValido = enlace.trim()
  }
  if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores)
  return { contenido: (contenido as string).trim(), enlace: enlaceValido }
}
