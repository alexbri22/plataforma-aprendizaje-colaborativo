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

export const LONGITUD_MAXIMA_CONTENIDO_BITACORA = 4000

/** Una entrada de bitácora (general §5.2: bitacoras). Privada: solo su autor
 * y quien organiza o co-organiza con `leer_bitacoras` la leen (P-06). */
export interface EntradaBitacora {
  id: string
  idMembresia: string
  contenido: string
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
