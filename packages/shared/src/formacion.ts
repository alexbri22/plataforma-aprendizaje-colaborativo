/*
 * Contenido formativo: catálogos fijos y límites de los recursos. Vive en
 * shared por la misma razón que el contrato de la foto de perfil: el panel
 * del administrador valida antes de enviar y el API vuelve a validar al
 * recibir; si los catálogos o los límites se escribieran dos veces,
 * terminarían por divergir.
 *
 * Las áreas y los elementos de Johnson y Johnson son constantes y no tablas
 * (mismo patrón que CATEGORIAS_INSIGNIA): son un catálogo editorial pequeño
 * que no se administra desde la interfaz.
 *
 * Fuente: docs/diseno-desarrollo-formacion.md §6 y §9.
 */

/** Las dos secciones públicas del concepto de producto (§7). Son un dato del
 * recurso por el que se puede filtrar, no una división de la pantalla. */
export const SECCIONES_FORMATIVAS = ['que_es_colaborar', 'como_colaborar'] as const
export type SeccionFormativa = (typeof SECCIONES_FORMATIVAS)[number]

export const ETIQUETAS_SECCION: Readonly<Record<SeccionFormativa, string>> = {
  que_es_colaborar: 'Qué es colaborar',
  como_colaborar: 'Cómo colaborar',
}

/** Tipos de recurso (§6.2). La práctica aplicada no es un recurso suelto:
 * vive como lección de un curso. */
export const TIPOS_RECURSO = ['texto', 'pdf', 'video', 'enlace', 'plantilla'] as const
export type TipoRecurso = (typeof TIPOS_RECURSO)[number]

export const ETIQUETAS_TIPO_RECURSO: Readonly<Record<TipoRecurso, string>> = {
  texto: 'Artículo',
  pdf: 'PDF',
  video: 'Video',
  enlace: 'Enlace',
  plantilla: 'Plantilla',
}

/** Áreas de habilidad (§9.1, entidad AreaHabilidad). `otros` es para el
 * recurso cuyo tema no encaja en ninguna de las cinco; va siempre al final. */
export const AREAS_HABILIDAD = [
  'comunicacion',
  'organizacion',
  'conflictos',
  'coordinacion',
  'reflexion',
  'otros',
] as const
export type AreaHabilidad = (typeof AREAS_HABILIDAD)[number]

export const ETIQUETAS_AREA: Readonly<Record<AreaHabilidad, string>> = {
  comunicacion: 'Comunicación',
  organizacion: 'Organización',
  conflictos: 'Conflictos',
  coordinacion: 'Coordinación',
  reflexion: 'Reflexión',
  otros: 'Otros',
}

/** Los cinco elementos de Johnson y Johnson (§3). */
export const ELEMENTOS_COLABORACION = [
  'responsabilidades',
  'interdependencia_positiva',
  'responsabilidad_individual_grupal',
  'interaccion_promotora',
  'procesamiento_grupal',
] as const
export type ElementoColaboracion = (typeof ELEMENTOS_COLABORACION)[number]

export const ETIQUETAS_ELEMENTO: Readonly<Record<ElementoColaboracion, string>> = {
  responsabilidades: 'Responsabilidades claras',
  interdependencia_positiva: 'Interdependencia positiva',
  responsabilidad_individual_grupal: 'Responsabilidad individual y grupal',
  interaccion_promotora: 'Interacción promotora',
  procesamiento_grupal: 'Procesamiento del grupo',
}

/** Estado editorial de un recurso. Solo el administrador crea contenido en
 * este alcance, así que no hay estados de revisión; si se aprueba la autoría
 * abierta (opción B, §13.1) se añaden valores sin migrar la columna. */
export const ESTATUS_RECURSO = ['borrador', 'publicado', 'retirado'] as const
export type EstatusRecurso = (typeof ESTATUS_RECURSO)[number]

export const ETIQUETAS_ESTATUS_RECURSO: Readonly<Record<EstatusRecurso, string>> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  retirado: 'Retirado',
}

/** Tipos que se muestran como artículo para leer en la plataforma; el resto
 * son "recursos breves" para usar en el momento. */
export const TIPOS_LECTURA: readonly TipoRecurso[] = ['texto']

/** Tipos cuyo contenido es un enlace externo. */
export const TIPOS_CON_URL: readonly TipoRecurso[] = ['video', 'enlace']

/** Tipos que admiten un archivo adjunto. En pdf es obligatorio para publicar;
 * en plantilla es opcional (puede ser solo texto con instrucciones). */
export const TIPOS_CON_ARCHIVO: readonly TipoRecurso[] = ['pdf', 'plantilla']

/** Único formato de archivo admitido en el MVP (§13.3): se rechazan
 * ejecutables y formatos que el navegador no pueda mostrar por sí solo. */
export const TIPOS_ARCHIVO_RECURSO = ['application/pdf'] as const

/** El archivo se guarda en la base (bytea) porque el API corre como función
 * sin disco persistente. Vercel corta el cuerpo de la petición en 4.5 MB, así
 * que el límite queda por debajo. */
export const MAX_BYTES_ARCHIVO_RECURSO = 4 * 1024 * 1024

export const LARGO_MAXIMO_RECURSO = {
  titulo: 120,
  resumen: 300,
  contenido: 20_000,
  transcripcion: 50_000,
  fuente: 300,
  licencia: 120,
} as const

export const DURACION_MAXIMA_RECURSO_MIN = 240

/** Paginación de los listados de recursos. El máximo protege al servidor de
 * una petición que pida todo el catálogo de una vez. */
export const POR_PAGINA_MAXIMA = 50
export const POR_PAGINA_PUBLICA = 9
export const POR_PAGINA_ADMIN = 20

export interface Paginacion {
  pagina: number
  porPagina: number
  total: number
  totalPaginas: number
}

export function esSeccionFormativa(valor: string): valor is SeccionFormativa {
  return (SECCIONES_FORMATIVAS as readonly string[]).includes(valor)
}

export function esTipoRecurso(valor: string): valor is TipoRecurso {
  return (TIPOS_RECURSO as readonly string[]).includes(valor)
}

export function esAreaHabilidad(valor: string): valor is AreaHabilidad {
  return (AREAS_HABILIDAD as readonly string[]).includes(valor)
}

export function esElementoColaboracion(valor: string): valor is ElementoColaboracion {
  return (ELEMENTOS_COLABORACION as readonly string[]).includes(valor)
}

export function esEstatusRecurso(valor: string): valor is EstatusRecurso {
  return (ESTATUS_RECURSO as readonly string[]).includes(valor)
}

export function esTipoArchivoRecurso(valor: string): boolean {
  return (TIPOS_ARCHIVO_RECURSO as readonly string[]).includes(valor)
}

/** Solo https: el contenido formativo es público y se abre desde cualquier
 * navegador (§10.3, "URLs con protocolos seguros"). Expresión regular y no
 * `new URL` porque este paquete compila sin las definiciones del navegador
 * ni de Node. Exige un host con al menos un punto y nada de espacios. */
const URL_HTTPS = /^https:\/\/[^\s/?#@]+\.[^\s/?#@]+(?:[/?#]\S*)?$/i

export function esUrlSegura(valor: string): boolean {
  return URL_HTTPS.test(valor)
}

/** Forma en que se compara el texto de búsqueda del catálogo: minúsculas, sin
 * acentos y con los guiones bajos de los identificadores como espacios. El
 * API guarda el texto de cada recurso así y normaliza igual lo que se busca. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/_/g, ' ')
}
