import type { ElementoEspacioEquipo, FuncionSeguimiento } from '@plataforma/shared'

// Copy en español para las nueve funciones de seguimiento y sus estados
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
      { valor: 'autogestionado', etiqueta: 'Autogestionada por participantes' },
      { valor: 'propuesta_sistema', etiqueta: 'Propuesta del sistema, que tú ajustas' },
      { valor: 'manual', etiqueta: 'Asignación manual, hecha por ti' },
    ],
  },
  {
    funcion: 'reporte_trabajo',
    titulo: 'Reporte de trabajo',
    descripcion: 'Si los equipos entregan reportes periódicos de avance.',
    opciones: [
      { valor: 'deshabilitado', etiqueta: 'Deshabilitado' },
      { valor: 'libre', etiqueta: 'Libre, sin fechas' },
      { valor: 'fechas_sugeridas', etiqueta: 'Fechas sugeridas, formato libre' },
      { valor: 'fechas_obligatorias', etiqueta: 'Fechas obligatorias, campos estructurados' },
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
  { valor: 'opcional', etiqueta: 'Opcional' },
  { valor: 'obligatorio', etiqueta: 'Obligatorio' },
]

export const ELEMENTOS_ESPACIO_EQUIPO_UI: { elemento: ElementoEspacioEquipo; etiqueta: string }[] = [
  { elemento: 'metas', etiqueta: 'Metas' },
  { elemento: 'avances', etiqueta: 'Avances' },
  { elemento: 'recursos', etiqueta: 'Recursos' },
]
