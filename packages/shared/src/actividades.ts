/*
 * Ciclo de vida y configuración de actividades: catálogo de acciones
 * autorizables, catálogo de funciones de seguimiento con sus estados
 * válidos, y catálogo de permisos de co-organizador.
 *
 * Vive en shared porque nucleo §2.2 exige un solo vocabulario de nombres de
 * acción entre servidor y cliente ("el mismo nombre lo usa el servidor para
 * autorizar y el cliente para preguntar si debe mostrar un control"), y
 * porque general §6.2 exige el mismo catálogo de funciones y estados para
 * validar en el cliente y en el servidor (general §4.4, "Formularios y
 * validación" del núcleo, §4.4).
 *
 * Fuentes: docs/diseno-desarrollo-general.md §6.1, §6.2, §7.3.
 *          docs/diseno-desarrollo-nucleo.md §2.2, §7.1, §7.4, §7.6, §7.9 (P-25).
 */

/** Catálogo de acciones del módulo de Actividades (nucleo §2.2). El nombre es
 * estable: el servidor lo usa para autorizar y el campo `capacidades` de
 * GET /api/actividades/{id} devuelve un subconjunto de estos valores. */
export const ACCIONES_ACTIVIDAD = [
  'configurar_funciones',
  'cerrar_inscripcion',
  'agregar_coorganizador',
] as const

export type AccionActividad = (typeof ACCIONES_ACTIVIDAD)[number]

/** Las nueve funciones de seguimiento del catálogo (general §6.2). Cada
 * actividad tiene exactamente una fila de configuración por función
 * (nucleo §7.1). */
export const FUNCIONES_SEGUIMIENTO = [
  'formacion_equipos',
  'reporte_trabajo',
  'bitacora_individual',
  'calificacion',
  'autoevaluacion_individual',
  'autoevaluacion_grupal',
  'evaluacion_pares',
  'espacio_equipo',
  'insignias',
] as const

export type FuncionSeguimiento = (typeof FUNCIONES_SEGUIMIENTO)[number]

/** Estados válidos por función, tal como los enumera general §6.2. Todas
 * salvo `espacio_equipo` tienen un estado simple, de esta lista. */
export const ESTADOS_POR_FUNCION: Readonly<Record<FuncionSeguimiento, readonly string[]>> = {
  formacion_equipos: ['autogestionado', 'propuesta_sistema', 'manual'],
  reporte_trabajo: ['deshabilitado', 'libre', 'fechas_sugeridas', 'fechas_obligatorias'],
  bitacora_individual: ['deshabilitada', 'habilitada'],
  calificacion: ['deshabilitada', 'directa', 'rubrica'],
  autoevaluacion_individual: ['deshabilitada', 'habilitada'],
  autoevaluacion_grupal: ['deshabilitada', 'habilitada'],
  evaluacion_pares: ['deshabilitada', 'opcional', 'obligatoria'],
  // espacio_equipo no usa esta lista: su estado es compuesto (ver
  // EstadoEspacioEquipo) y se valida con esElementoEspacioEquipoValido.
  espacio_equipo: [],
  insignias: ['deshabilitado', 'solo_organizador', 'organizador_y_participantes'],
}

/** `espacio_equipo` empaqueta tres sub-estados en una sola fila de las
 * nueve (general §6.2: "Por elemento: Opcional / Obligatorio"), porque
 * nucleo §7.1 inserta "las filas de configuración de las nueve funciones" y
 * no once. Se serializa como JSON en ConfiguracionFuncion.estado. */
export const ELEMENTOS_ESPACIO_EQUIPO = ['metas', 'avances', 'recursos'] as const
export type ElementoEspacioEquipo = (typeof ELEMENTOS_ESPACIO_EQUIPO)[number]

export const ESTADOS_ELEMENTO_ESPACIO_EQUIPO = ['opcional', 'obligatorio'] as const
export type EstadoElementoEspacioEquipo = (typeof ESTADOS_ELEMENTO_ESPACIO_EQUIPO)[number]

export type EstadoEspacioEquipo = Readonly<
  Record<ElementoEspacioEquipo, EstadoElementoEspacioEquipo>
>

export function serializarEstadoEspacioEquipo(estado: EstadoEspacioEquipo): string {
  return JSON.stringify(estado)
}

/** Devuelve null si el texto no es un JSON con exactamente los tres
 * elementos y valores válidos, en lugar de lanzar: quien llama decide si
 * eso es un error de validación (petición) o un dato corrupto (lectura). */
export function parsearEstadoEspacioEquipo(texto: string): EstadoEspacioEquipo | null {
  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    return null
  }
  if (!valor || typeof valor !== 'object') return null

  const objeto = valor as Record<string, unknown>
  const claves = Object.keys(objeto)
  if (claves.length !== ELEMENTOS_ESPACIO_EQUIPO.length) return null

  for (const elemento of ELEMENTOS_ESPACIO_EQUIPO) {
    const estadoElemento = objeto[elemento]
    if (
      typeof estadoElemento !== 'string' ||
      !ESTADOS_ELEMENTO_ESPACIO_EQUIPO.includes(estadoElemento as EstadoElementoEspacioEquipo)
    ) {
      return null
    }
  }

  return objeto as unknown as EstadoEspacioEquipo
}

/** P-25 (nucleo §7.9): configuración con la que nace toda actividad nueva.
 * Formación autogestionada y espacio de equipo opcional; el resto
 * deshabilitado hasta que quien organiza lo habilite. */
export const CONFIGURACION_POR_DEFECTO: Readonly<Record<FuncionSeguimiento, string>> = {
  formacion_equipos: 'autogestionado',
  reporte_trabajo: 'deshabilitado',
  bitacora_individual: 'deshabilitada',
  calificacion: 'deshabilitada',
  autoevaluacion_individual: 'deshabilitada',
  autoevaluacion_grupal: 'deshabilitada',
  evaluacion_pares: 'deshabilitada',
  espacio_equipo: serializarEstadoEspacioEquipo({
    metas: 'opcional',
    avances: 'opcional',
    recursos: 'opcional',
  }),
  insignias: 'deshabilitado',
}

/** Catálogo de permisos otorgables a un co-organizador (general §7.3). */
export const PERMISOS_COORGANIZADOR = [
  'configurar_actividad',
  'gestionar_inscripcion',
  'gestionar_equipos',
  'calificar_y_comentar',
  'leer_bitacoras',
  'otorgar_insignias',
  'desactivar_participantes',
  'consultar_historial_completo',
  'gestionar_coorganizadores',
  'iniciar_cierre_y_archivar',
] as const

export type PermisoCoorganizador = (typeof PERMISOS_COORGANIZADOR)[number]

/** Conjunto que recibe un co-organizador nuevo si no se especifica otro
 * (general §7.3, tabla "Conjunto por defecto"). Los dos permisos reservados
 * al organizador por defecto no están aquí. */
export const PERMISOS_COORGANIZADOR_POR_DEFECTO: readonly PermisoCoorganizador[] = [
  'configurar_actividad',
  'gestionar_inscripcion',
  'gestionar_equipos',
  'calificar_y_comentar',
  'leer_bitacoras',
  'otorgar_insignias',
  'desactivar_participantes',
  'consultar_historial_completo',
]
