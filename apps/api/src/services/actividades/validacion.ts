import {
  ELEMENTOS_ESPACIO_EQUIPO,
  ESTADOS_ELEMENTO_ESPACIO_EQUIPO,
  ESTADOS_POR_FUNCION,
  FUNCIONES_SEGUIMIENTO,
  PERMISOS_COORGANIZADOR,
  serializarEstadoEspacioEquipo,
  type EstadoEspacioEquipo,
  type FuncionSeguimiento,
  type PermisoCoorganizador,
} from '@plataforma/shared'
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

// Valida que el parámetro de ruta :funcion sea uno de los nueve valores del
// catálogo (@plataforma/shared, docs/diseno-desarrollo-general.md §6.2).
export function validarFuncion(valor: unknown): FuncionSeguimiento {
  if (
    typeof valor === 'string' &&
    (FUNCIONES_SEGUIMIENTO as readonly string[]).includes(valor)
  ) {
    return valor as FuncionSeguimiento
  }
  throw new ErrorValidacion({ funcion: 'Esta función de seguimiento no existe.' })
}

function esEstadoElementoValido(valor: unknown): valor is EstadoEspacioEquipo[keyof EstadoEspacioEquipo] {
  return (
    typeof valor === 'string' &&
    (ESTADOS_ELEMENTO_ESPACIO_EQUIPO as readonly string[]).includes(valor)
  )
}

// PUT /api/actividades/{id}/configuracion/{funcion}: el cuerpo depende de la
// función. espacio_equipo trae los tres sub-estados por separado (más
// legible para el cliente que enviar el JSON ya serializado); el resto trae
// un solo campo `estado` con uno de sus valores válidos
// (docs/diseno-desarrollo-nucleo.md §4.4, "un mismo esquema... valida en el
// cliente... y en el servidor").
export function validarDatosConfigurarFuncion(funcion: FuncionSeguimiento, cuerpo: unknown): string {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>

  if (funcion === 'espacio_equipo') {
    const detallePorCampo: Record<string, string> = {}
    const estado = {} as Record<(typeof ELEMENTOS_ESPACIO_EQUIPO)[number], string>

    for (const elemento of ELEMENTOS_ESPACIO_EQUIPO) {
      if (esEstadoElementoValido(datos[elemento])) {
        estado[elemento] = datos[elemento] as string
      } else {
        detallePorCampo[elemento] = 'Debe ser "opcional" u "obligatorio".'
      }
    }

    if (Object.keys(detallePorCampo).length > 0) throw new ErrorValidacion(detallePorCampo)
    return serializarEstadoEspacioEquipo(estado as EstadoEspacioEquipo)
  }

  const estadosValidos = ESTADOS_POR_FUNCION[funcion]
  const estado = datos.estado
  if (typeof estado === 'string' && (estadosValidos as readonly string[]).includes(estado)) {
    return estado
  }

  throw new ErrorValidacion({
    estado: `Debe ser uno de: ${estadosValidos.join(', ')}.`,
  })
}

export interface DatosAgregarCoorganizador {
  permisos?: PermisoCoorganizador[]
}

// PUT /api/actividades/{id}/coorganizadores/{idUsuario}: `permisos` es
// opcional — si no llega, el servicio aplica el conjunto por defecto de
// docs/diseno-desarrollo-general.md §7.3.
export function validarDatosAgregarCoorganizador(cuerpo: unknown): DatosAgregarCoorganizador {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  if (datos.permisos === undefined) return {}

  if (
    !Array.isArray(datos.permisos) ||
    !datos.permisos.every(
      (permiso) => typeof permiso === 'string' && (PERMISOS_COORGANIZADOR as readonly string[]).includes(permiso),
    )
  ) {
    throw new ErrorValidacion({
      permisos: `Debe ser un arreglo de valores entre: ${PERMISOS_COORGANIZADOR.join(', ')}.`,
    })
  }

  return { permisos: datos.permisos as PermisoCoorganizador[] }
}
