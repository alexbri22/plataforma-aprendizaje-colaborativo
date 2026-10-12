import type { ElementoEspacioEquipo, FuncionSeguimiento } from '@plataforma/shared'

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
      { valor: 'autogestionado', etiqueta: 'Autogestionada' },
      { valor: 'manual', etiqueta: 'Asignación manual' },
    ],
  },
  {
    funcion: 'bitacora_individual',
    titulo: 'Bitácora individual',
    descripcion: 'Registro personal de avances y dificultades de cada participante.',
    opciones: [
      { valor: 'deshabilitada', etiqueta: 'Deshabilitada' },
      { valor: 'habilitada', etiqueta: 'Habilitada' },
    ],
  },
  {
    funcion: 'calificacion',
    titulo: 'Calificación',
    descripcion: 'Cómo se asigna la calificación individual de cada participante.',
    opciones: [
      { valor: 'deshabilitada', etiqueta: 'Deshabilitada' },
      { valor: 'directa', etiqueta: 'Asignación directa' },
      { valor: 'rubrica', etiqueta: 'Mediante rúbrica' },
    ],
  },
  {
    funcion: 'autoevaluacion_individual',
    titulo: 'Autoevaluación individual',
    descripcion: 'Cada participante evalúa su propio desempeño.',
    opciones: [
      { valor: 'deshabilitada', etiqueta: 'Deshabilitada' },
      { valor: 'habilitada', etiqueta: 'Habilitada' },
    ],
  },
  {
    funcion: 'autoevaluacion_grupal',
    titulo: 'Autoevaluación grupal',
    descripcion: 'Cada integrante evalúa el desempeño de su equipo.',
    opciones: [
      { valor: 'deshabilitada', etiqueta: 'Deshabilitada' },
      { valor: 'habilitada', etiqueta: 'Habilitada' },
    ],
  },
  {
    funcion: 'evaluacion_pares',
    titulo: 'Evaluación por pares',
    descripcion: 'Cada participante evalúa a sus compañeros de equipo.',
    opciones: [
      { valor: 'deshabilitada', etiqueta: 'Deshabilitada' },
      { valor: 'opcional', etiqueta: 'Habilitada, opcional' },
      { valor: 'obligatoria', etiqueta: 'Habilitada, obligatoria' },
    ],
  },
  {
    funcion: 'insignias',
    titulo: 'Insignias',
    descripcion: 'Quién puede otorgar insignias durante el periodo de cierre.',
    opciones: [
      { valor: 'deshabilitado', etiqueta: 'Deshabilitado' },
      { valor: 'solo_organizador', etiqueta: 'Solo tú otorgas' },
      { valor: 'organizador_y_participantes', etiqueta: 'Tú y los participantes otorgan entre sí' },
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
    elemento: 'avances',
    etiqueta: 'Avances',
    descripcion: 'Entregas periódicas del trabajo, con su propio calendario.',
  },
  {
    elemento: 'recursos',
    etiqueta: 'Recursos',
    descripcion: 'Enlaces y materiales que el equipo comparte.',
  },
]

// 'ninguna' borra el calendario de avances; las otras lo generan entre el
// inicio y el término de la actividad (docs/diseno-desarrollo-nucleo.md §9.2).
export const OPCIONES_PERIODICIDAD: OpcionEstado[] = [
  { valor: 'ninguna', etiqueta: 'Sin calendario' },
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'mensual', etiqueta: 'Mensual' },
]

// Con qué instrumento se evalúa una tarea de Proceso colaborativo — una sola
// elección por tarea, no varias; elegirlo es lo que la habilita, no hay un
// interruptor aparte. Si el instrumento va a ser una plantilla del sistema,
// una definida por el profesor o un archivo libre se decide después, al
// crear esa instancia del recurso durante la actividad: eso no es parte de
// la configuración.
export type InstrumentoRecurso =
  | 'cuestionario_autoevaluacion'
  | 'cuestionario'
  | 'entrevista'
  | 'rubrica'
  | 'diario_aprendizaje'
  | 'coevaluacion'
  | 'examen'

const ETIQUETA_POR_INSTRUMENTO: Record<InstrumentoRecurso, string> = {
  cuestionario_autoevaluacion: 'Cuestionario de autoevaluación',
  cuestionario: 'Cuestionario',
  entrevista: 'Entrevista',
  rubrica: 'Rúbrica',
  diario_aprendizaje: 'Diario de aprendizaje',
  coevaluacion: 'Coevaluación',
  examen: 'Examen',
}

export function etiquetaInstrumento(instrumento: InstrumentoRecurso): string {
  return ETIQUETA_POR_INSTRUMENTO[instrumento]
}

// Proceso colaborativo: los cinco aspectos centrales del aprendizaje
// colaborativo de Johnson y Johnson (1999) que docs/concepto-producto.md §1
// nombra como fundamento teórico de la plataforma — no están en el catálogo
// FuncionSeguimiento del servidor (@plataforma/shared) porque todavía no
// tienen backend; son conceptos nuevos y aparte de las ocho funciones de
// seguimiento existentes, no un reemplazo de ninguna de ellas.
export type TareaProcesoColaborativo =
  | 'definicion_responsabilidades'
  | 'interdependencia_positiva'
  | 'responsabilidad_individual_grupal'
  | 'interaccion'
  | 'evaluacion_grupo_habilidades_sociales'

export const TAREAS_PROCESO_COLABORATIVO: {
  tarea: TareaProcesoColaborativo
  etiqueta: string
  descripcion: string
}[] = [
  {
    tarea: 'definicion_responsabilidades',
    etiqueta: 'Definición de responsabilidades',
    descripcion: 'Qué rol o tarea le corresponde a cada integrante del equipo.',
  },
  {
    tarea: 'interdependencia_positiva',
    etiqueta: 'Interdependencia positiva',
    descripcion: 'Que el resultado de cada integrante dependa del trabajo de todo el equipo.',
  },
  {
    tarea: 'responsabilidad_individual_grupal',
    etiqueta: 'Responsabilidad individual y grupal',
    descripcion:
      'Que se distinga la contribución de cada integrante dentro del resultado del equipo.',
  },
  {
    tarea: 'interaccion',
    etiqueta: 'Interacción',
    descripcion:
      'Que los integrantes se ayuden y se den retroalimentación mientras trabajan juntos.',
  },
  {
    tarea: 'evaluacion_grupo_habilidades_sociales',
    etiqueta: 'Evaluación de grupo y habilidades sociales',
    descripcion:
      'Cómo el equipo reflexiona sobre su funcionamiento y las habilidades sociales que practicó.',
  },
]

// Qué instrumentos ofrece cada tarea: no todas sirven el mismo repertorio
// (producto trajo la lista por tarea, no una genérica para las cinco).
// Responsabilidades, Interdependencia positiva e Interacción calcan uno a
// uno la tarea de producto del mismo nombre; Responsabilidad individual y
// grupal toma la de "Evaluación individual y de grupo" (es donde esa
// responsabilidad se hace visible) y Evaluación de grupo y habilidades
// sociales toma la de "Habilidades sociales" — ninguna lista se repite entre
// las cinco tareas.
export const INSTRUMENTOS_POR_TAREA: Record<TareaProcesoColaborativo, InstrumentoRecurso[]> = {
  definicion_responsabilidades: [
    'cuestionario_autoevaluacion',
    'cuestionario',
    'entrevista',
    'rubrica',
  ],
  interdependencia_positiva: ['cuestionario_autoevaluacion', 'diario_aprendizaje'],
  responsabilidad_individual_grupal: [
    'cuestionario_autoevaluacion',
    'coevaluacion',
    'examen',
    'entrevista',
    'rubrica',
  ],
  interaccion: ['cuestionario', 'entrevista', 'rubrica'],
  evaluacion_grupo_habilidades_sociales: [
    'cuestionario_autoevaluacion',
    'coevaluacion',
    'cuestionario',
    'entrevista',
    'rubrica',
  ],
}
