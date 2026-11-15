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

/** Estado editorial de un recurso, un curso o una ruta. Los tres de en medio
 * son de la autoría abierta (opción B de §13.1, nota del incremento 6): solo
 * los recorre lo que propone un usuario y revisa el administrador. */
export const ESTATUS_RECURSO = [
  'borrador',
  'en_revision',
  'cambios_solicitados',
  'rechazado',
  'publicado',
  'retirado',
] as const
export type EstatusRecurso = (typeof ESTATUS_RECURSO)[number]

export const ETIQUETAS_ESTATUS_RECURSO: Readonly<Record<EstatusRecurso, string>> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  cambios_solicitados: 'Cambios solicitados',
  rechazado: 'Rechazado',
  publicado: 'Publicado',
  retirado: 'Retirado',
}

/** Los que el administrador fija directamente en su propio contenido y en
 * las rutas. Los de revisión solo se alcanzan con un envío o una decisión. */
export const ESTATUS_EDITORIALES = ['borrador', 'publicado', 'retirado'] as const
export type EstatusEditorial = (typeof ESTATUS_EDITORIALES)[number]

// ---- Autoría abierta con revisión (nota del incremento 6) ----

/** De dónde viene un contenido: del administrador (editorial) o de un
 * usuario que lo propuso y pasó por revisión. */
export const ORIGENES_CONTENIDO = ['editorial', 'propuesta'] as const
export type OrigenContenido = (typeof ORIGENES_CONTENIDO)[number]

/** Lo que se puede proponer. Las rutas siguen siendo editoriales. */
export const TIPOS_CONTENIDO = ['recurso', 'curso'] as const
export type TipoContenido = (typeof TIPOS_CONTENIDO)[number]

/** Estados de una propuesta en los que su autor la edita. En los demás nadie
 * la edita: en revisión está congelada, y rechazada es definitiva. */
export const ESTATUS_EDITABLES_POR_AUTOR: readonly EstatusRecurso[] = [
  'borrador',
  'cambios_solicitados',
]

/** Lo que decide el administrador sobre una propuesta. */
export const DECISIONES_REVISION = [
  'aprobar',
  'pedir_cambios',
  'rechazar',
  'retirar',
  'publicar_de_nuevo',
] as const
export type DecisionRevision = (typeof DECISIONES_REVISION)[number]

/** Las decisiones que exigen motivo (MOD-01): la persona debe saber qué
 * cambiar o por qué no se publicó. Aprobar admite un comentario opcional. */
export const DECISIONES_CON_MOTIVO: readonly DecisionRevision[] = [
  'pedir_cambios',
  'rechazar',
  'retirar',
]

/** Lo que queda en el registro: los envíos del autor y las decisiones. */
export const ACCIONES_REVISION = [
  'enviada',
  'cancelada',
  'aprobada',
  'cambios_solicitados',
  'rechazada',
  'retirada',
  'publicada_de_nuevo',
] as const
export type AccionRevision = (typeof ACCIONES_REVISION)[number]

export const ETIQUETAS_ACCION_REVISION: Readonly<Record<AccionRevision, string>> = {
  enviada: 'Enviada a revisión',
  cancelada: 'Envío cancelado',
  aprobada: 'Aprobada y publicada',
  cambios_solicitados: 'Cambios solicitados',
  rechazada: 'Rechazada',
  retirada: 'Retirada del catálogo',
  publicada_de_nuevo: 'Publicada de nuevo',
}

/** Criterios mínimos de publicación (§6.4). El administrador los marca al
 * revisar; para aprobar deben estar todos. */
export const CRITERIOS_PUBLICACION = [
  { id: 'proposito', etiqueta: 'Propósito formativo claro y relacionado con colaboración.' },
  { id: 'derechos', etiqueta: 'Fuentes, autoría y derechos de uso identificados.' },
  { id: 'completo', etiqueta: 'Contenido completo, coherente y sin enlaces rotos.' },
  { id: 'lenguaje', etiqueta: 'Lenguaje respetuoso, comprensible y sin estereotipos.' },
  { id: 'accesible', etiqueta: 'Alternativas accesibles para contenido visual o audiovisual.' },
  { id: 'practica', etiqueta: 'Una práctica o uso concreto, no solo información general.' },
  { id: 'datos', etiqueta: 'Sin datos personales, publicidad ni archivos ejecutables.' },
] as const
export type CriterioPublicacion = (typeof CRITERIOS_PUBLICACION)[number]['id']

/** Límites por persona, para que nadie llene la cola ni la base: propuestas
 * en revisión a la vez, y propuestas abiertas (en borrador o con cambios
 * solicitados). */
export const MAX_PROPUESTAS_EN_REVISION = 3
export const MAX_PROPUESTAS_ABIERTAS = 10

export const LARGO_MAXIMO_MOTIVO = 2_000

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

// ---- Cursos (docs/diseno-desarrollo-formacion.md §2.4, §5 y §9) ----

/** Un curso usa el mismo ciclo editorial que un recurso (borrador →
 * publicado → retirado → publicado); el tipo se comparte. */
export type EstatusCurso = EstatusRecurso

export const NIVELES_CURSO = ['inicial', 'intermedio', 'avanzado'] as const
export type NivelCurso = (typeof NIVELES_CURSO)[number]

export const ETIQUETAS_NIVEL_CURSO: Readonly<Record<NivelCurso, string>> = {
  inicial: 'Inicial',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

/** Una lección o reutiliza un recurso de la biblioteca (`recurso`) o es
 * contenido propio del curso: lectura, práctica guiada o reflexión (§5.2). */
export const TIPOS_LECCION = ['recurso', 'lectura', 'practica', 'reflexion'] as const
export type TipoLeccion = (typeof TIPOS_LECCION)[number]

export const ETIQUETAS_TIPO_LECCION: Readonly<Record<TipoLeccion, string>> = {
  recurso: 'Recurso de la biblioteca',
  lectura: 'Lectura',
  practica: 'Práctica',
  reflexion: 'Reflexión',
}

/** Un curso del MVP tiene entre dos y cinco lecciones (§2.4). El máximo se
 * aplica siempre; el mínimo, al publicar. */
export const MIN_LECCIONES_CURSO = 2
export const MAX_LECCIONES_CURSO = 5

export const LARGO_MAXIMO_CURSO = {
  titulo: 120,
  resumen: 300,
  objetivo: 600,
  practicaFinal: 600,
} as const

export const LARGO_MAXIMO_LECCION = {
  titulo: 120,
  contenido: 20_000,
} as const

// ---- Rutas de aprendizaje (§4.1 y nota del incremento 4) ----

/** Una ruta reúne de 2 a 5 cursos con una misma finalidad. El máximo se
 * aplica siempre; el mínimo, al publicar. */
export const MIN_CURSOS_RUTA = 2
export const MAX_CURSOS_RUTA = 5

export const LARGO_MAXIMO_RUTA = {
  titulo: 120,
  finalidad: 300,
  descripcion: 2_000,
} as const

/** Cuántos elementos de Johnson y Johnson puede elegir una persona como
 * "lo que quiero fortalecer". Pocos a propósito: elegir los cinco no dice
 * nada. */
export const MAX_ELEMENTOS_PREFERIDOS = 2

/** Respuesta privada a una lección de reflexión (CUR-03). */
export const LARGO_MAXIMO_REFLEXION = 5_000

// ---- Constancias de finalización (nota del incremento 5) ----

/** Lo que una constancia hace constar que alguien terminó. */
export const TIPOS_CONSTANCIA = ['curso', 'ruta'] as const
export type TipoConstancia = (typeof TIPOS_CONSTANCIA)[number]

/**
 * El folio es `CO3-XXXX-XXXX`: ocho caracteres al azar del alfabeto de
 * Crockford (sin I, L, O ni U, para que nadie los confunda al dictarlo o
 * copiarlo a mano). Son 40 bits: no se pueden recorrer probando, y por eso la
 * página de verificación puede ser pública.
 */
export const PREFIJO_FOLIO = 'CO3'
export const ALFABETO_FOLIO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const FORMATO_FOLIO = /^CO3-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/

/** El folio en su forma canónica, o null si no tiene el formato. Acepta
 * minúsculas y espacios alrededor, como llega de quien lo escribe a mano. */
export function normalizarFolio(valor: string): string | null {
  const folio = valor.trim().toUpperCase()
  return FORMATO_FOLIO.test(folio) ? folio : null
}

export function esNivelCurso(valor: string): valor is NivelCurso {
  return (NIVELES_CURSO as readonly string[]).includes(valor)
}

export function esTipoLeccion(valor: string): valor is TipoLeccion {
  return (TIPOS_LECCION as readonly string[]).includes(valor)
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

export function esEstatusEditorial(valor: string): valor is EstatusEditorial {
  return (ESTATUS_EDITORIALES as readonly string[]).includes(valor)
}

export function esTipoContenido(valor: string): valor is TipoContenido {
  return (TIPOS_CONTENIDO as readonly string[]).includes(valor)
}

export function esDecisionRevision(valor: string): valor is DecisionRevision {
  return (DECISIONES_REVISION as readonly string[]).includes(valor)
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

/** Texto contra el que busca el catálogo: lo escrito más el área y los
 * elementos con su etiqueta visible. Con el identificador, buscar "Procesamiento
 * del grupo" no encontraría `procesamiento_grupal`. Lo usan los servicios de
 * recursos y cursos y los scripts de semilla, para que la regla sea una sola. */
export function textoDeBusquedaCatalogo(
  textos: string[],
  area: AreaHabilidad | null,
  elementos: ElementoColaboracion[],
): string {
  return normalizarBusqueda(
    [
      ...textos,
      area ? ETIQUETAS_AREA[area] : '',
      ...elementos.map((e) => ETIQUETAS_ELEMENTO[e]),
    ].join(' '),
  )
}
