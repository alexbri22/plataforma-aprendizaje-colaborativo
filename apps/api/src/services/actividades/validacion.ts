import { ErrorValidacion } from '../../errores.js'

// Mock manual sin paquete de validación compartido todavía (ver la nota en
// services/cuentas/validacion.ts, sigue fuera de alcance de esta tarea).

function requerido(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined
  const limpio = valor.trim()
  return limpio.length > 0 ? limpio : undefined
}

function fecha(valor: unknown): Date | undefined {
  if (typeof valor !== 'string' || !valor.trim()) return undefined
  const parseada = new Date(valor)
  return Number.isNaN(parseada.getTime()) ? undefined : parseada
}

function enteroPositivo(valor: unknown): number | undefined {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  if (!Number.isFinite(numero) || !Number.isInteger(numero) || numero <= 0) return undefined
  return numero
}

export interface DatosCrearActividadValidados {
  nombre: string
  objetivo: string
  informacionGeneral: string
  fechaInicio: Date
  fechaTermino: Date
  fechaLimiteInscripcion: Date
  plazoCierreDias: number
  numeroEquiposEsperado: number
}

// Todos los campos son obligatorios al crear (docs/diseno-desarrollo-general.md
// §5.1, nota "Decisión de producto — creación con todos los campos y clave
// desde el origen"; docs/diseno-desarrollo-nucleo.md §7.1 exige solo nombre y
// objetivo, decisión superada por esa nota). `tipoActividadPercibida` es
// telemetría de producto fuera del diccionario de datos (ver el comentario en
// apps/web/src/features/actividades/actividades.api.ts): se acepta si llega,
// pero no se valida ni se persiste.
export function validarDatosCrearActividad(cuerpo: unknown): DatosCrearActividadValidados {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const detallePorCampo: Record<string, string> = {}

  const nombre = requerido(datos.nombre)
  if (!nombre) detallePorCampo.nombre = 'El nombre es requerido.'

  const objetivo = requerido(datos.objetivo)
  if (!objetivo) detallePorCampo.objetivo = 'El objetivo es requerido.'

  const informacionGeneral = requerido(datos.informacionGeneral)
  if (!informacionGeneral) {
    detallePorCampo.informacionGeneral = 'La información general es requerida.'
  }

  const fechaInicio = fecha(datos.fechaInicio)
  if (!fechaInicio) detallePorCampo.fechaInicio = 'La fecha de inicio es requerida.'

  const fechaTermino = fecha(datos.fechaTermino)
  if (!fechaTermino) {
    detallePorCampo.fechaTermino = 'La fecha de término es requerida.'
  } else if (fechaInicio && fechaTermino <= fechaInicio) {
    detallePorCampo.fechaTermino = 'Debe ser posterior a la fecha de inicio.'
  }

  const fechaLimiteInscripcion = fecha(datos.fechaLimiteInscripcion)
  if (!fechaLimiteInscripcion) {
    detallePorCampo.fechaLimiteInscripcion = 'La fecha límite de inscripción es requerida.'
  }

  const plazoCierreDias = enteroPositivo(datos.plazoCierreDias)
  if (!plazoCierreDias) {
    detallePorCampo.plazoCierreDias = 'El plazo de cierre debe ser un número entero mayor a cero.'
  }

  const numeroEquiposEsperado = enteroPositivo(datos.numeroEquiposEsperado)
  if (!numeroEquiposEsperado) {
    detallePorCampo.numeroEquiposEsperado =
      'El número de equipos esperado debe ser un número entero mayor a cero.'
  }

  if (Object.keys(detallePorCampo).length > 0) {
    throw new ErrorValidacion(detallePorCampo)
  }

  return {
    nombre: nombre as string,
    objetivo: objetivo as string,
    informacionGeneral: informacionGeneral as string,
    fechaInicio: fechaInicio as Date,
    fechaTermino: fechaTermino as Date,
    fechaLimiteInscripcion: fechaLimiteInscripcion as Date,
    plazoCierreDias: plazoCierreDias as number,
    numeroEquiposEsperado: numeroEquiposEsperado as number,
  }
}
