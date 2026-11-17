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
 *          docs/diseno-desarrollo-nucleo.md §2.2, §7.1, §7.4, §7.6, §7.9 (P-25),
 *          §9.2 (periodos de reporte, P-28).
 */

/** Catálogo de acciones del módulo de Actividades (nucleo §2.2). El nombre es
 * estable: el servidor lo usa para autorizar y el campo `capacidades` de
 * GET /api/actividades/{id} devuelve un subconjunto de estos valores. */
export const ACCIONES_ACTIVIDAD = [
  'configurar_funciones',
  // Cambiar funciones una vez iniciado el desarrollo (general §6.2, P-17):
  // habilitar siempre; deshabilitar o cambiar de modo solo sin datos.
  'ajustar_funciones',
  'ajustar_periodos',
  'cerrar_inscripcion',
  // Desarrollo → Cierre (nucleo §7.4). Sin precondición, a diferencia de
  // cerrar_inscripcion. Hoy el único efecto implementado es el cambio de
  // fase: abrir calificación/evaluaciones y caducar invitaciones pendientes
  // no tienen qué hacer todavía porque esos módulos no existen.
  'iniciar_cierre',
  // Cierre → Archivada antes de que venza el plazo de cierre (nucleo §7.4).
  'archivar',
  'agregar_coorganizador',
  // Equipos (nucleo §8). Sus permisos salen del rol, del permiso de
  // co-organizador y del estado de `formacion_equipos`; nunca de un tipo de
  // actividad.
  'formar_equipos',
  'asignar_integrantes',
  'cerrar_formacion',
  'elegir_equipo',
  'editar_equipo',
  'generar_propuesta_equipos',
  // Seguimiento (nucleo §9.1): crear, editar o eliminar un elemento del
  // espacio del propio equipo (metas, avances, recursos). La matriz de
  // permisos sigue siendo de Actividades (nucleo §2.2, "una sola función");
  // que el equipo sobre el que se actúa sea el propio depende de datos y lo
  // verifica el servicio de Seguimiento, igual que editar_equipo.
  'usar_espacio_equipo',
  // Bitácora individual (nucleo §9.3): escribir y editar una entrada propia.
  // A diferencia de usar_espacio_equipo, general §7.3 la marca con "—" fijo
  // para organizador y co-organizador (no "sin equipo propio": una
  // exclusión de rol escrita en el documento), así que autorizar() la
  // resuelve antes de la concesión general al organizador (ver
  // ACCIONES_EXCLUSIVAS_DE_PARTICIPANTE en capacidades.ts).
  'escribir_bitacora',
  // Publicación de proyectos: subir o corregir el entregable final del propio
  // equipo durante el cierre. Solo quien participa, como la bitácora.
  'publicar_proyecto',
  // Comentarios (nucleo §10.4): escribir o editar un comentario sobre un
  // elemento del espacio de equipo o una entrada de bitácora. Organizador y
  // co-organizador con `calificar_y_comentar`; los participantes no la
  // tienen (no está en ACCIONES_DE_AUTOSERVICIO).
  'comentar',
  // Evaluación (nucleo §10.1): pesos de componentes y aspectos, e
  // instrumentos de cada aspecto. Hasta que la actividad se archive, porque
  // la calificación es calculada y un cambio de peso no deja datos huérfanos.
  'configurar_calificacion',
  // Responder una plantilla del proceso colaborativo (nucleo §10.1). Como
  // escribir_bitacora, general §7.3 la marca con "—" fijo para organizador y
  // co-organizador: solo los participantes responden y reciben calificación.
  'responder_instrumento',
  // Capturar o corregir el puntaje de un instrumento que no se puntúa solo
  // (nucleo §10.3): una actividad externa, el proyecto o la bitácora. Quien
  // organiza y los co-organizadores con `calificar_y_comentar`.
  'capturar_puntaje',
] as const

export type AccionActividad = (typeof ACCIONES_ACTIVIDAD)[number]

/** Las cinco funciones de seguimiento del catálogo (general §6.2). Cada
 * actividad tiene exactamente una fila de configuración por función
 * (nucleo §7.1). El reporte de trabajo ya no es una función aparte: es el
 * elemento `avances` de `espacio_equipo`, con su calendario en los periodos
 * de reporte (ver PERIODICIDADES). Tampoco las autoevaluaciones: son los
 * instrumentos de los aspectos del proceso colaborativo (calificacion.ts), igual
 * que la evaluación por pares. */
export const FUNCIONES_SEGUIMIENTO = [
  'formacion_equipos',
  'bitacora_individual',
  'calificacion',
  'espacio_equipo',
  'insignias',
] as const

export type FuncionSeguimiento = (typeof FUNCIONES_SEGUIMIENTO)[number]

/** Si la bitácora admite entradas: en cualquiera de sus dos formatos. */
export function bitacoraHabilitada(estado: string | undefined): boolean {
  return estado === 'guiada' || estado === 'libre'
}

/** Estados de la función `formacion_equipos` (general §6.2). La propuesta del
 * sistema no es un estado: es una acción disponible en `manual`. Son estados de
 * la función, no tipos de actividad: la actividad no tiene modo. */
export const ESTADOS_FORMACION_EQUIPOS = ['autogestionado', 'manual'] as const
export type EstadoFormacionEquipos = (typeof ESTADOS_FORMACION_EQUIPOS)[number]

export function esEstadoFormacionEquipos(valor: unknown): valor is EstadoFormacionEquipos {
  return ESTADOS_FORMACION_EQUIPOS.includes(valor as EstadoFormacionEquipos)
}

/** Estados válidos por función, tal como los enumera general §6.2. Todas
 * salvo `espacio_equipo` tienen un estado simple, de esta lista. */
export const ESTADOS_POR_FUNCION: Readonly<Record<FuncionSeguimiento, readonly string[]>> = {
  formacion_equipos: ESTADOS_FORMACION_EQUIPOS,
  // Habilitada, en uno de dos formatos (nucleo §9.3): guiada, con las
  // preguntas de BLOQUES_BITACORA, o libre.
  bitacora_individual: ['deshabilitada', 'guiada', 'libre'],
  // Habilitada, se calcula por ponderación (general §4.2): ya no hay modos
  // directo y rúbrica.
  calificacion: ['deshabilitada', 'habilitada'],
  // espacio_equipo no usa esta lista: su estado es compuesto (ver
  // EstadoEspacioEquipo) y se valida con esElementoEspacioEquipoValido.
  espacio_equipo: [],
  insignias: ['deshabilitado', 'solo_organizador', 'organizador_y_participantes'],
}

/** `espacio_equipo` empaqueta un sub-estado por elemento en una sola fila de las
 * ocho (general §6.2: "Por elemento: Deshabilitado / Opcional /
 * Obligatorio"), porque nucleo §7.1 inserta una fila de configuración por
 * función y no una por elemento. Se serializa como JSON en
 * ConfiguracionFuncion.estado. */
export const ELEMENTOS_ESPACIO_EQUIPO = [
  'metas',
  'planeacion',
  'avances',
  'recursos',
  'producto',
] as const
export type ElementoEspacioEquipo = (typeof ELEMENTOS_ESPACIO_EQUIPO)[number]

/** Lo que tiene calendario de revisiones: cada elemento del espacio de
 * equipo y la bitácora individual. Cada uno con sus propios periodos. */
export const ELEMENTOS_CON_CALENDARIO = [...ELEMENTOS_ESPACIO_EQUIPO, 'bitacora'] as const
export type ElementoConCalendario = (typeof ELEMENTOS_CON_CALENDARIO)[number]

export function esElementoConCalendario(valor: unknown): valor is ElementoConCalendario {
  return (
    typeof valor === 'string' && (ELEMENTOS_CON_CALENDARIO as readonly string[]).includes(valor)
  )
}

export const ESTADOS_ELEMENTO_ESPACIO_EQUIPO = ['deshabilitado', 'opcional', 'obligatorio'] as const
export type EstadoElementoEspacioEquipo = (typeof ESTADOS_ELEMENTO_ESPACIO_EQUIPO)[number]

export type EstadoEspacioEquipo = Readonly<
  Record<ElementoEspacioEquipo, EstadoElementoEspacioEquipo>
>

export function serializarEstadoEspacioEquipo(estado: EstadoEspacioEquipo): string {
  return JSON.stringify(estado)
}

/** Devuelve null si el texto no es un JSON de elementos conocidos con
 * valores válidos, en lugar de lanzar: quien llama decide si eso es un error
 * de validación (petición) o un dato corrupto (lectura).
 *
 * Un elemento que falta toma el estado por defecto ('opcional'): las
 * actividades creadas antes de agregar Planeación y Producto (modelo ABPCL)
 * guardaron solo tres, y así los reciben como cualquier actividad nueva en
 * vez de leerse como dato corrupto. */
export function parsearEstadoEspacioEquipo(texto: string): EstadoEspacioEquipo | null {
  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    return null
  }
  if (!valor || typeof valor !== 'object') return null

  const objeto = valor as Record<string, unknown>
  if (
    Object.keys(objeto).some(
      (clave) => !(ELEMENTOS_ESPACIO_EQUIPO as readonly string[]).includes(clave),
    )
  ) {
    return null
  }

  const estado = {} as Record<ElementoEspacioEquipo, EstadoElementoEspacioEquipo>
  for (const elemento of ELEMENTOS_ESPACIO_EQUIPO) {
    const estadoElemento = objeto[elemento] ?? 'opcional'
    if (
      typeof estadoElemento !== 'string' ||
      !ESTADOS_ELEMENTO_ESPACIO_EQUIPO.includes(estadoElemento as EstadoElementoEspacioEquipo)
    ) {
      return null
    }
    estado[elemento] = estadoElemento as EstadoElementoEspacioEquipo
  }

  return estado
}

/** P-25 (nucleo §7.9): configuración con la que nace toda actividad nueva.
 * Formación autogestionada y espacio de equipo opcional; el resto
 * deshabilitado hasta que quien organiza lo habilite. */
export const CONFIGURACION_POR_DEFECTO: Readonly<Record<FuncionSeguimiento, string>> = {
  formacion_equipos: 'autogestionado',
  bitacora_individual: 'deshabilitada',
  calificacion: 'deshabilitada',
  espacio_equipo: serializarEstadoEspacioEquipo({
    metas: 'opcional',
    planeacion: 'opcional',
    avances: 'opcional',
    recursos: 'opcional',
    producto: 'opcional',
  }),
  insignias: 'deshabilitado',
}

/** Periodicidades con las que se genera el calendario de `avances`
 * (nucleo §9.2, P-28). 'ninguna' no genera periodos: borra los existentes. */
export const PERIODICIDADES = ['semanal', 'quincenal', 'mensual'] as const
export type Periodicidad = (typeof PERIODICIDADES)[number]

/** Un periodo cancelado sigue en el calendario (conserva su orden) y puede
 * reactivarse; no es lo mismo que borrarlo. */
export const ESTADOS_PERIODO = ['activo', 'cancelado'] as const
export type EstadoPeriodo = (typeof ESTADOS_PERIODO)[number]

/** Forma de un periodo de reporte en la API. Las fechas son de calendario
 * (YYYY-MM-DD), no instantes. */
export interface PeriodoReporte {
  id: string
  elemento: ElementoConCalendario
  orden: number
  fechaInicio: string
  fechaFin: string
  estado: EstadoPeriodo
}

/** Operación de la planeación: cuánto se entregó dentro de las fechas de un
 * periodo activo. Lo publicado todavía no apunta a un periodo (nucleo §9.2,
 * Fase B), así que cuenta lo que se publicó entre su inicio y su fin, en la
 * zona horaria de la plataforma. Los elementos del espacio de equipo se
 * cuentan por equipo; la bitácora, por participante. */
export interface EntregasDePeriodo {
  idPeriodo: string
  hechos: number
  total: number
  unidad: 'equipos' | 'participantes'
  /** Para quien participa: si su equipo (o, en la bitácora, él mismo) ya
   * publicó algo. Nulo para quien organiza o para quien no tiene equipo. */
  mio: boolean | null
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
