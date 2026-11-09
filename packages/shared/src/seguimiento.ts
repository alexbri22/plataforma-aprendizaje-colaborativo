/*
 * Contrato de la API del contenido del espacio de equipo (nucleo §9.1, §9.4):
 * metas, avances y recursos. El atributo de tipo y los tres estados de
 * configuración (deshabilitado/opcional/obligatorio) ya están en
 * actividades.ts, porque de ahí sale el gate de habilitado/deshabilitado que
 * este módulo reutiliza. Lo que falta aquí es la forma de un elemento con
 * contenido real.
 *
 * Fuentes: docs/diseno-desarrollo-general.md §4.4, §5.2.
 *          docs/diseno-desarrollo-nucleo.md §9.1, §9.4.
 */

import type { ElementoEspacioEquipo } from './actividades.js'

export const LONGITUD_MAXIMA_CONTENIDO_ELEMENTO = 2000

/** Un elemento del espacio de equipo con su contenido (general §5.2:
 * elementos_espacio_equipo). Cualquier integrante del equipo puede crear,
 * editar o eliminar cualquiera, por eso `autor` identifica a quien lo
 * escribió sin que eso limite quién puede tocarlo después (nucleo §9.1). */
/** Un elemento puede llevar un enlace y un archivo, opcionales y uno de
 * cada uno. El archivo se guarda en la base (bytea), como los PDF de los
 * recursos formativos: el API corre sin disco persistente y Vercel corta el
 * cuerpo de la petición en 4.5 MB. Lo que pese más va por enlace (Drive). */
export const MAX_BYTES_ARCHIVO_ELEMENTO = 4 * 1024 * 1024

export const LONGITUD_MAXIMA_ENLACE_ELEMENTO = 2048

/** PDF, imágenes y documentos de Office (actuales y anteriores a 2007), con
 * la extensión que los identifica cuando el navegador no da el tipo. */
export const EXTENSIONES_ARCHIVO_ELEMENTO = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  xls: 'application/vnd.ms-excel',
  ppt: 'application/vnd.ms-powerpoint',
} as const

export const TIPOS_ARCHIVO_ELEMENTO = [...new Set(Object.values(EXTENSIONES_ARCHIVO_ELEMENTO))]

export function esTipoArchivoElemento(tipo: string): boolean {
  return (TIPOS_ARCHIVO_ELEMENTO as string[]).includes(tipo)
}

export interface ArchivoDeElemento {
  nombre: string
  tipo: string
  tamano: number
}

export interface ElementoDeEspacioEquipo {
  id: string
  tipo: ElementoEspacioEquipo
  contenido: string
  enlace: string | null
  archivo: ArchivoDeElemento | null
  idMembresiaAutor: string
  autor: string
  fechaCreacion: string
  fechaActualizacion: string
}

/*
 * Bitácora individual (nucleo §9.3): entradas con fecha y contenido libre,
 * vinculadas a la membresía y no al equipo. Comentarios (nucleo §10.4): un
 * comentario sobre un elemento del espacio de equipo o sobre una entrada de
 * bitácora, con visibilidad heredada de lo comentado (concepto §5.3).
 *
 * Fuentes: docs/diseno-desarrollo-general.md §4.4, §5.2.
 *          docs/diseno-desarrollo-nucleo.md §9.3, §9.4, §10.4.
 */

/** Bitácora guiada (nucleo §9.3): las preguntas del documento de
 * evaluaciones, fijas y en código como el catálogo de insignias. Las
 * respuestas se guardan por clave. Las claves son estables (general §4.2):
 * nunca se renombran ni se reutilizan, y cambiar el sentido de una pregunta
 * es una clave nueva. */
export const BLOQUES_BITACORA = [
  {
    clave: 'aprendizaje',
    titulo: '¿Qué he aprendido?',
    preguntas: [
      {
        clave: 'conocimientos_adquiridos',
        texto: '¿Qué conocimientos o habilidades he adquirido en este periodo?',
      },
      {
        clave: 'comprendido_gracias_a_companeros',
        texto: '¿Qué he comprendido mejor gracias a mis compañeros?',
      },
      { clave: 'aspecto_mas_dificil', texto: '¿Qué aspecto me ha resultado más difícil?' },
      { clave: 'duda_pendiente', texto: '¿Qué pregunta o duda me queda por resolver?' },
    ],
  },
  {
    clave: 'responsabilidad',
    titulo: 'Mi responsabilidad individual',
    preguntas: [
      { clave: 'tareas_cumplidas', texto: '¿He cumplido con las tareas que tenía asignadas?' },
      { clave: 'tiempo_aprovechado', texto: '¿He aprovechado el tiempo de trabajo?' },
      {
        clave: 'informacion_aportada',
        texto: '¿He preparado y aportado la información que correspondía?',
      },
      {
        clave: 'consecuencias_asumidas',
        texto: '¿He asumido las consecuencias de mis decisiones y compromisos?',
      },
    ],
  },
  {
    clave: 'reflexion',
    titulo: 'Mi reflexión',
    preguntas: [
      {
        clave: 'aportacion_concreta',
        texto: '¿Qué aportación concreta he realizado al trabajo del equipo?',
      },
      {
        clave: 'importancia_cooperar',
        texto: '¿Qué he aprendido sobre la importancia de trabajar cooperativamente?',
      },
    ],
  },
] as const

export type ClavePreguntaBitacora = (typeof BLOQUES_BITACORA)[number]['preguntas'][number]['clave']

export const PREGUNTAS_BITACORA: readonly { clave: ClavePreguntaBitacora; texto: string }[] =
  BLOQUES_BITACORA.flatMap(
    (bloque): readonly { clave: ClavePreguntaBitacora; texto: string }[] => bloque.preguntas,
  )

export const LONGITUD_MAXIMA_RESPUESTA_BITACORA = 2000

/** Solo las preguntas respondidas: una respuesta vacía no se guarda. */
export type RespuestasBitacora = Partial<Record<ClavePreguntaBitacora, string>>

/** Validación de una entrada guiada, la misma en el cliente y en el
 * servidor (nucleo §4.4). Recorta, descarta las respuestas vacías y exige al
 * menos una. Devuelve el error por clave (o en `respuestas` si es de la
 * entrada completa) en lugar de lanzar: quien llama decide cómo mostrarlo. */
export function validarRespuestasBitacora(
  valor: unknown,
): { respuestas: RespuestasBitacora } | { errores: Record<string, string> } {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return { errores: { respuestas: 'Responde al menos una pregunta.' } }
  }
  const claves = PREGUNTAS_BITACORA.map((pregunta) => pregunta.clave as string)
  const errores: Record<string, string> = {}
  const respuestas: Record<string, string> = {}

  for (const [clave, texto] of Object.entries(valor)) {
    if (!claves.includes(clave)) {
      errores[clave] = 'No es una pregunta de la bitácora.'
      continue
    }
    if (typeof texto !== 'string') {
      errores[clave] = 'Debe ser texto.'
      continue
    }
    const recortado = texto.trim()
    if (recortado === '') continue
    if (recortado.length > LONGITUD_MAXIMA_RESPUESTA_BITACORA) {
      errores[clave] = `Debe tener a lo más ${LONGITUD_MAXIMA_RESPUESTA_BITACORA} caracteres.`
      continue
    }
    respuestas[clave] = recortado
  }

  if (Object.keys(errores).length > 0) return { errores }
  if (Object.keys(respuestas).length === 0) {
    return { errores: { respuestas: 'Responde al menos una pregunta.' } }
  }
  // En el orden del catálogo y no en el de la petición, para que se lean
  // igual en cualquier parte. Para comparar dos entradas no basta: jsonb
  // reordena las claves al guardar (ver mismasRespuestasBitacora).
  const ordenadas: Record<string, string> = {}
  for (const clave of claves) if (respuestas[clave]) ordenadas[clave] = respuestas[clave]
  return { respuestas: ordenadas as RespuestasBitacora }
}

/** Si dos entradas dicen lo mismo, pregunta por pregunta. No se comparan
 * serializadas porque Postgres guarda jsonb con sus claves reordenadas. */
export function mismasRespuestasBitacora(a: RespuestasBitacora, b: RespuestasBitacora): boolean {
  return PREGUNTAS_BITACORA.every(({ clave }) => (a[clave] ?? '') === (b[clave] ?? ''))
}

/** La primera respuesta en el orden de las preguntas: es el extracto del
 * historial y la vista previa de la entrada. */
export function primeraRespuestaBitacora(respuestas: RespuestasBitacora): string {
  for (const { clave } of PREGUNTAS_BITACORA) {
    const texto = respuestas[clave]
    if (texto) return texto
  }
  return ''
}

/** Una entrada de bitácora (general §5.2: bitacoras). Privada: solo su autor
 * y quien organiza o co-organiza con `leer_bitacoras` la leen (P-06). */
export interface EntradaBitacora {
  id: string
  idMembresia: string
  respuestas: RespuestasBitacora
  fechaCreacion: string
  fechaActualizacion: string
}

export const LONGITUD_MAXIMA_CONTENIDO_COMENTARIO = 2000

/** Las dos entidades que puede comentarse hoy (nucleo §10.4): un elemento
 * del espacio de equipo o una entrada de bitácora. */
export const TIPOS_ENTIDAD_COMENTARIO = ['elemento_espacio_equipo', 'bitacora'] as const
export type TipoEntidadComentario = (typeof TIPOS_ENTIDAD_COMENTARIO)[number]

/** Un comentario (general §5.3: comentarios). `idEntidad` es una referencia
 * polimórfica sin llave foránea, igual que el historial: apunta a
 * elementos_espacio_equipo o a bitacoras según `tipoEntidad`. Solo el
 * organizador y los co-organizadores con `calificar_y_comentar` lo
 * escriben, por eso no hay un campo de "destinatario": la visibilidad de
 * quién lo lee la hereda la entidad referida, no el comentario mismo. */
export interface Comentario {
  id: string
  idMembresiaAutor: string
  autor: string
  tipoEntidad: TipoEntidadComentario
  idEntidad: string
  contenido: string
  fechaCreacion: string
  fechaActualizacion: string
}
