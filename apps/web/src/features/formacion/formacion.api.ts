import type {
  AreaHabilidad,
  ElementoColaboracion,
  EstatusCurso,
  EstatusRecurso,
  NivelCurso,
  Paginacion,
  SeccionFormativa,
  TipoLeccion,
  TipoRecurso,
} from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

// Contratos de /api/recursos y /api/admin/recursos
// (docs/diseno-desarrollo-formacion.md §9.3 y §12.6). Espejo de los tipos que
// devuelve apps/api/src/services/formacion/recursos.service.ts.

export interface ArchivoRecurso {
  nombre: string
  tamano: number
  url: string
}

export interface ResumenRecurso {
  idRecurso: string
  seccion: SeccionFormativa
  titulo: string
  resumen: string
  tipoRecurso: TipoRecurso
  area: AreaHabilidad | null
  elementos: ElementoColaboracion[]
  duracionMin: number | null
  orden: number
  fechaActualizacion: string
  archivo: ArchivoRecurso | null
}

export interface RecursoPublico extends ResumenRecurso {
  contenido: string
  transcripcion: string
  fuente: string
  licencia: string
}

export interface RecursoAdmin extends RecursoPublico {
  estatus: EstatusRecurso
  fechaCreacion: string
  autor: { idUsuario: string; nombre: string } | null
}

export interface PaginaDe<T> {
  recursos: T[]
  paginacion: Paginacion
}

export interface ConsultaRecursosAdmin {
  texto?: string
  estatus?: EstatusRecurso
  pagina?: number
  porPagina?: number
}

export interface ConsultaRecursos {
  seccion?: SeccionFormativa
  area?: AreaHabilidad
  tipos?: readonly TipoRecurso[]
  texto?: string
  pagina?: number
  porPagina?: number
}

/** Un recurso visto en su editor: dice en qué cursos se usa. */
export interface RecursoAdminDetalle extends RecursoAdmin {
  usadoEn: { idCurso: string; titulo: string; estatus: EstatusCurso }[]
}

/** Lo que el formulario del panel envía. En una edición todo es opcional. */
export interface DatosRecurso {
  seccion: SeccionFormativa
  titulo: string
  resumen: string
  tipoRecurso: TipoRecurso
  contenido: string
  transcripcion: string
  area: AreaHabilidad | null
  elementos: ElementoColaboracion[]
  duracionMin: number | null
  fuente: string
  licencia: string
  orden: number
  estatus: EstatusRecurso
}

// ---- Cursos: espejo de apps/api/src/services/formacion/cursos.service.ts ----

export interface RecursoDeLeccion {
  idRecurso: string
  titulo: string
  tipoRecurso: TipoRecurso
  estatus: EstatusRecurso
  duracionMin: number | null
}

export interface LeccionAdmin {
  idLeccion: string
  orden: number
  titulo: string
  tipo: TipoLeccion
  contenido: string
  obligatoria: boolean
  duracionMin: number | null
  duracionEfectivaMin: number | null
  recurso: RecursoDeLeccion | null
}

export interface ResumenCursoAdmin {
  idCurso: string
  titulo: string
  resumen: string
  area: AreaHabilidad | null
  nivel: NivelCurso | null
  estatus: EstatusCurso
  orden: number
  numLecciones: number
  duracionMin: number
  fechaActualizacion: string
}

export interface CursoAdmin extends ResumenCursoAdmin {
  objetivo: string
  elementos: ElementoColaboracion[]
  practicaFinal: string
  fechaCreacion: string
  autor: { idUsuario: string; nombre: string } | null
  lecciones: LeccionAdmin[]
}

export interface DatosCurso {
  titulo: string
  resumen: string
  objetivo: string
  area: AreaHabilidad | null
  elementos: ElementoColaboracion[]
  nivel: NivelCurso | null
  practicaFinal: string
  estatus: EstatusCurso
}

export interface DatosLeccion {
  titulo: string
  tipo: TipoLeccion
  idRecurso: string | null
  contenido: string
  obligatoria: boolean
  duracionMin: number | null
}

export interface ResumenCursoPublico {
  idCurso: string
  titulo: string
  resumen: string
  area: AreaHabilidad | null
  nivel: NivelCurso | null
  elementos: ElementoColaboracion[]
  numLecciones: number
  duracionMin: number
  fechaActualizacion: string
}

export interface LeccionEnIndice {
  idLeccion: string
  orden: number
  titulo: string
  tipo: TipoLeccion
  obligatoria: boolean
  duracionMin: number | null
  disponible: boolean
  tipoRecurso: TipoRecurso | null
}

export interface CursoPublico extends ResumenCursoPublico {
  objetivo: string
  practicaFinal: string
  autor: string | null
  lecciones: LeccionEnIndice[]
}

export interface LeccionPublica extends LeccionEnIndice {
  contenido: string
  recurso: RecursoPublico | null
  anterior: { idLeccion: string; titulo: string } | null
  siguiente: { idLeccion: string; titulo: string } | null
}

export interface PaginaDeCursos<T> {
  cursos: T[]
  paginacion: Paginacion
}

export interface ConsultaCursos {
  area?: AreaHabilidad
  nivel?: NivelCurso
  elemento?: ElementoColaboracion
  texto?: string
  pagina?: number
  porPagina?: number
}

export class ErrorFormacion extends Error {
  readonly status?: number
  readonly detallePorCampo?: Record<string, string>

  constructor(mensaje: string, status?: number, detallePorCampo?: Record<string, string>) {
    super(mensaje)
    this.status = status
    this.detallePorCampo = detallePorCampo
  }
}

const MENSAJE_SIN_CONEXION =
  'No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.'

async function leerError(respuesta: Response, porDefecto: string): Promise<ErrorFormacion> {
  try {
    const cuerpo = (await respuesta.json()) as { mensaje?: unknown; detallePorCampo?: unknown }
    const mensaje =
      typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim() ? cuerpo.mensaje : porDefecto
    const detalle =
      cuerpo.detallePorCampo && typeof cuerpo.detallePorCampo === 'object'
        ? (cuerpo.detallePorCampo as Record<string, string>)
        : undefined
    return new ErrorFormacion(mensaje, respuesta.status, detalle)
  } catch {
    return new ErrorFormacion(porDefecto, respuesta.status)
  }
}

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, { credentials: 'include', ...opciones })
  } catch {
    throw new ErrorFormacion(MENSAJE_SIN_CONEXION)
  }
  if (!respuesta.ok) throw await leerError(respuesta, porDefecto)
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}

function json(metodo: string, cuerpo: unknown): RequestInit {
  return {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  }
}

/** URL absoluta del archivo de un recurso, para enlazarlo desde la página. */
export function urlArchivo(archivo: ArchivoRecurso): string {
  return `${BASE_URL}${archivo.url}`
}

/** Descarga del archivo para el panel: funciona en cualquier estatus (la
 * pública solo con el recurso publicado), para revisar el PDF de un borrador
 * antes de publicarlo. Lleva la misma marca de versión que la pública para
 * que reemplazar el archivo no muestre el anterior. */
export function urlArchivoAdmin(idRecurso: string, archivo: ArchivoRecurso): string {
  const version = new URL(archivo.url, 'http://x').searchParams.get('v')
  return `${BASE_URL}/api/admin/recursos/${encodeURIComponent(idRecurso)}/archivo${
    version ? `?v=${version}` : ''
  }`
}

// ---- Público ----

function aQuery(consulta: ConsultaRecursos & { estatus?: EstatusRecurso }): string {
  const params = new URLSearchParams()
  if (consulta.seccion) params.set('seccion', consulta.seccion)
  if (consulta.area) params.set('area', consulta.area)
  if (consulta.tipos?.length) params.set('tipo', consulta.tipos.join(','))
  if (consulta.texto) params.set('q', consulta.texto)
  if (consulta.estatus) params.set('estatus', consulta.estatus)
  if (consulta.pagina) params.set('pagina', String(consulta.pagina))
  if (consulta.porPagina) params.set('porPagina', String(consulta.porPagina))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listarRecursos(
  consulta: ConsultaRecursos = {},
): Promise<PaginaDe<ResumenRecurso>> {
  return pedir<PaginaDe<ResumenRecurso>>(
    `/api/recursos${aQuery(consulta)}`,
    'No pudimos cargar los recursos. Intenta de nuevo.',
  )
}

export async function obtenerRecurso(idRecurso: string): Promise<RecursoPublico> {
  const { recurso } = await pedir<{ recurso: RecursoPublico }>(
    `/api/recursos/${encodeURIComponent(idRecurso)}`,
    'No pudimos cargar el recurso. Intenta de nuevo.',
  )
  return recurso
}

// ---- Administración ----

export async function listarRecursosAdmin(
  consulta: ConsultaRecursosAdmin = {},
): Promise<PaginaDe<RecursoAdmin>> {
  return pedir<PaginaDe<RecursoAdmin>>(
    `/api/admin/recursos${aQuery(consulta)}`,
    'No pudimos cargar los recursos. Intenta de nuevo.',
  )
}

export async function obtenerRecursoAdmin(idRecurso: string): Promise<RecursoAdminDetalle> {
  const { recurso } = await pedir<{ recurso: RecursoAdminDetalle }>(
    `/api/admin/recursos/${encodeURIComponent(idRecurso)}`,
    'No pudimos cargar el recurso. Intenta de nuevo.',
  )
  return recurso
}

export async function crearRecurso(datos: Partial<DatosRecurso>): Promise<RecursoAdminDetalle> {
  const { recurso } = await pedir<{ recurso: RecursoAdminDetalle }>(
    '/api/admin/recursos',
    'No pudimos crear el recurso. Revisa los campos e intenta de nuevo.',
    json('POST', datos),
  )
  return recurso
}

export async function actualizarRecurso(
  idRecurso: string,
  cambios: Partial<DatosRecurso>,
): Promise<RecursoAdminDetalle> {
  const { recurso } = await pedir<{ recurso: RecursoAdminDetalle }>(
    `/api/admin/recursos/${encodeURIComponent(idRecurso)}`,
    'No pudimos guardar el recurso. Revisa los campos e intenta de nuevo.',
    json('PATCH', cambios),
  )
  return recurso
}

export async function eliminarRecurso(idRecurso: string): Promise<void> {
  await pedir<void>(
    `/api/admin/recursos/${encodeURIComponent(idRecurso)}`,
    'No pudimos eliminar el recurso. Intenta de nuevo.',
    { method: 'DELETE' },
  )
}

export async function subirArchivoRecurso(
  idRecurso: string,
  archivo: File,
): Promise<RecursoAdminDetalle> {
  const { recurso } = await pedir<{ recurso: RecursoAdminDetalle }>(
    `/api/admin/recursos/${encodeURIComponent(idRecurso)}/archivo`,
    'No pudimos subir el archivo. Intenta de nuevo.',
    {
      method: 'PUT',
      headers: {
        'Content-Type': archivo.type || 'application/pdf',
        'X-Nombre-Archivo': encodeURIComponent(archivo.name),
      },
      body: archivo,
    },
  )
  return recurso
}

export async function quitarArchivoRecurso(idRecurso: string): Promise<RecursoAdminDetalle> {
  const { recurso } = await pedir<{ recurso: RecursoAdminDetalle }>(
    `/api/admin/recursos/${encodeURIComponent(idRecurso)}/archivo`,
    'No pudimos quitar el archivo. Intenta de nuevo.',
    { method: 'DELETE' },
  )
  return recurso
}

// ---- Cursos públicos ----

function queryCursos(consulta: ConsultaCursos): string {
  const params = new URLSearchParams()
  if (consulta.area) params.set('area', consulta.area)
  if (consulta.nivel) params.set('nivel', consulta.nivel)
  if (consulta.elemento) params.set('elemento', consulta.elemento)
  if (consulta.texto) params.set('q', consulta.texto)
  if (consulta.pagina) params.set('pagina', String(consulta.pagina))
  if (consulta.porPagina) params.set('porPagina', String(consulta.porPagina))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listarCursos(
  consulta: ConsultaCursos = {},
): Promise<PaginaDeCursos<ResumenCursoPublico>> {
  return pedir<PaginaDeCursos<ResumenCursoPublico>>(
    `/api/cursos${queryCursos(consulta)}`,
    'No pudimos cargar los cursos. Intenta de nuevo.',
  )
}

export async function obtenerCurso(idCurso: string): Promise<CursoPublico> {
  const { curso } = await pedir<{ curso: CursoPublico }>(
    `/api/cursos/${encodeURIComponent(idCurso)}`,
    'No pudimos cargar el curso. Intenta de nuevo.',
  )
  return curso
}

export async function obtenerLeccion(idCurso: string, idLeccion: string): Promise<LeccionPublica> {
  const { leccion } = await pedir<{ leccion: LeccionPublica }>(
    `/api/cursos/${encodeURIComponent(idCurso)}/lecciones/${encodeURIComponent(idLeccion)}`,
    'No pudimos cargar la lección. Intenta de nuevo.',
  )
  return leccion
}

// ---- Cursos: administración ----

const rutaCursoAdmin = (idCurso: string) => `/api/admin/cursos/${encodeURIComponent(idCurso)}`

async function pedirCurso(ruta: string, porDefecto: string, opciones?: RequestInit) {
  const { curso } = await pedir<{ curso: CursoAdmin }>(ruta, porDefecto, opciones)
  return curso
}

export async function listarCursosAdmin(
  consulta: Pick<ConsultaCursos, 'pagina' | 'porPagina'> = {},
): Promise<PaginaDeCursos<ResumenCursoAdmin>> {
  return pedir<PaginaDeCursos<ResumenCursoAdmin>>(
    `/api/admin/cursos${queryCursos(consulta)}`,
    'No pudimos cargar los cursos. Intenta de nuevo.',
  )
}

export function obtenerCursoAdmin(idCurso: string): Promise<CursoAdmin> {
  return pedirCurso(rutaCursoAdmin(idCurso), 'No pudimos cargar el curso. Intenta de nuevo.')
}

export function crearCurso(datos: Partial<DatosCurso>): Promise<CursoAdmin> {
  return pedirCurso(
    '/api/admin/cursos',
    'No pudimos crear el curso. Revisa los campos e intenta de nuevo.',
    json('POST', datos),
  )
}

export function actualizarCurso(
  idCurso: string,
  cambios: Partial<DatosCurso>,
): Promise<CursoAdmin> {
  return pedirCurso(
    rutaCursoAdmin(idCurso),
    'No pudimos guardar el curso. Revisa los campos e intenta de nuevo.',
    json('PATCH', cambios),
  )
}

export async function eliminarCurso(idCurso: string): Promise<void> {
  await pedir<void>(rutaCursoAdmin(idCurso), 'No pudimos eliminar el curso. Intenta de nuevo.', {
    method: 'DELETE',
  })
}

export function agregarLeccion(idCurso: string, datos: Partial<DatosLeccion>): Promise<CursoAdmin> {
  return pedirCurso(
    `${rutaCursoAdmin(idCurso)}/lecciones`,
    'No pudimos agregar la lección. Intenta de nuevo.',
    json('POST', datos),
  )
}

export function actualizarLeccion(
  idCurso: string,
  idLeccion: string,
  cambios: Partial<DatosLeccion>,
): Promise<CursoAdmin> {
  return pedirCurso(
    `${rutaCursoAdmin(idCurso)}/lecciones/${encodeURIComponent(idLeccion)}`,
    'No pudimos guardar la lección. Intenta de nuevo.',
    json('PATCH', cambios),
  )
}

export function eliminarLeccion(idCurso: string, idLeccion: string): Promise<CursoAdmin> {
  return pedirCurso(
    `${rutaCursoAdmin(idCurso)}/lecciones/${encodeURIComponent(idLeccion)}`,
    'No pudimos quitar la lección. Intenta de nuevo.',
    { method: 'DELETE' },
  )
}

export function reordenarLecciones(idCurso: string, lecciones: string[]): Promise<CursoAdmin> {
  return pedirCurso(
    `${rutaCursoAdmin(idCurso)}/lecciones/orden`,
    'No pudimos reordenar las lecciones. Intenta de nuevo.',
    json('PUT', { lecciones }),
  )
}
