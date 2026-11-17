import {
  ASPECTOS_PROCESO,
  type ClaveAspectoProceso,
  type ElementoEspacioEquipo,
  type FuncionSeguimiento,
} from '@plataforma/shared'

// Copy en español para las funciones de seguimiento y sus estados
// (docs/diseno-desarrollo-general.md §6.2). Vive en el cliente y no en
// @plataforma/shared porque es texto de presentación, no el catálogo de
// valores válidos (nucleo §3.4: "no vive en él... los modelos de vista del
// cliente"). espacio_equipo se trata aparte porque su estado es compuesto
// (ver ELEMENTOS_ESPACIO_EQUIPO_UI más abajo).

export interface OpcionEstado {
  valor: string
  etiqueta: string
}

export interface DefinicionFuncion {
  funcion: Exclude<FuncionSeguimiento, 'espacio_equipo'>
  titulo: string
  descripcion: string
  opciones: OpcionEstado[]
}

export const FUNCIONES_SIMPLES: DefinicionFuncion[] = [
  {
    funcion: 'formacion_equipos',
    titulo: 'Formación de equipos',
    descripcion: 'Cómo se conforman los equipos al cerrar la inscripción.',
    opciones: [
      { valor: 'autogestionado', etiqueta: 'Cada quien elige su equipo' },
      { valor: 'manual', etiqueta: 'Tú asignas los equipos' },
    ],
  },
  {
    funcion: 'bitacora_individual',
    titulo: 'Bitácora individual',
    descripcion: 'Registro personal de avances y dificultades de cada participante.',
    // Guiada responde las preguntas del documento de evaluaciones; libre es
    // un texto abierto (nucleo §9.3).
    opciones: [
      { valor: 'deshabilitada', etiqueta: 'Deshabilitada' },
      { valor: 'guiada', etiqueta: 'Habilitada, con preguntas guía' },
      { valor: 'libre', etiqueta: 'Habilitada, texto libre' },
    ],
  },
  {
    funcion: 'calificacion',
    titulo: 'Calificación',
    descripcion: 'Se calcula con los pesos que definas para cada parte del trabajo.',
    opciones: [
      { valor: 'deshabilitada', etiqueta: 'Deshabilitada' },
      { valor: 'habilitada', etiqueta: 'Habilitada' },
    ],
  },
  {
    funcion: 'insignias',
    titulo: 'Reconocimientos',
    descripcion: 'Quién puede dar reconocimientos durante el cierre.',
    opciones: [
      { valor: 'deshabilitado', etiqueta: 'Deshabilitados' },
      { valor: 'solo_organizador', etiqueta: 'Solo tú los das' },
      { valor: 'organizador_y_participantes', etiqueta: 'Tú y los participantes, entre sí' },
    ],
  },
]

export const OPCIONES_ELEMENTO_ESPACIO_EQUIPO: OpcionEstado[] = [
  { valor: 'deshabilitado', etiqueta: 'Deshabilitado' },
  { valor: 'opcional', etiqueta: 'Opcional' },
  { valor: 'obligatorio', etiqueta: 'Obligatorio' },
]

export const ELEMENTOS_ESPACIO_EQUIPO_UI: {
  elemento: ElementoEspacioEquipo
  etiqueta: string
  descripcion: string
}[] = [
  { elemento: 'metas', etiqueta: 'Metas', descripcion: 'Lo que el equipo se propone lograr.' },
  {
    elemento: 'planeacion',
    etiqueta: 'Planeación',
    descripcion: 'Cómo se organiza el equipo para lograr sus metas.',
  },
  {
    elemento: 'avances',
    etiqueta: 'Avances',
    descripcion: 'Entregas periódicas del trabajo.',
  },
  {
    elemento: 'recursos',
    etiqueta: 'Materiales',
    descripcion: 'Enlaces y archivos que el equipo comparte.',
  },
  {
    elemento: 'producto',
    etiqueta: 'Producto',
    descripcion: 'Lo que el equipo entrega como resultado final.',
  },
]

/** La bitácora va en la misma tabla que el espacio de equipo: tiene su
 * porcentaje del proyecto y su calendario de revisiones, aunque es de cada
 * participante y no del equipo. */
export const BITACORA_UI = {
  elemento: 'bitacora',
  etiqueta: 'Bitácora',
  descripcion: 'Registro personal de cada participante.',
} as const

export const OPCIONES_BITACORA: OpcionEstado[] =
  FUNCIONES_SIMPLES.find((f) => f.funcion === 'bitacora_individual')?.opciones ?? []

// 'ninguna' borra el calendario del elemento; las otras lo generan entre el
// inicio y el término de la actividad (docs/diseno-desarrollo-nucleo.md §9.2).
export const OPCIONES_PERIODICIDAD: OpcionEstado[] = [
  { valor: 'ninguna', etiqueta: 'Sin calendario' },
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'mensual', etiqueta: 'Mensual' },
]

// Proceso colaborativo: los cinco aspectos de concepto §1, con la clave y el
// nombre del catálogo compartido (ASPECTOS_PROCESO, general §4.2) y una
// descripción que es solo texto de presentación.
const DESCRIPCION_POR_ASPECTO: Record<ClaveAspectoProceso, string> = {
  definicion_responsabilidades: 'Qué rol o tarea le corresponde a cada integrante del equipo.',
  interdependencia_positiva:
    'Que el resultado de cada integrante dependa del trabajo de todo el equipo.',
  responsabilidad_individual_grupal:
    'Que se distinga la contribución de cada integrante dentro del resultado del equipo.',
  interaccion: 'Que los integrantes se ayuden y se den retroalimentación mientras trabajan juntos.',
  evaluacion_grupo_habilidades_sociales:
    'Cómo el equipo reflexiona sobre su funcionamiento y las habilidades sociales que practicó.',
}

export type TareaProcesoColaborativo = ClaveAspectoProceso

export const TAREAS_PROCESO_COLABORATIVO: {
  tarea: TareaProcesoColaborativo
  etiqueta: string
  descripcion: string
}[] = ASPECTOS_PROCESO.map(({ clave, nombre }) => ({
  tarea: clave,
  etiqueta: nombre,
  descripcion: DESCRIPCION_POR_ASPECTO[clave],
}))
