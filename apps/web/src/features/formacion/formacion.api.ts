import type {
  AreaHabilidad,
  ElementoColaboracion,
  EstatusRecurso,
  Paginacion,
  SeccionFormativa,
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

export interface ConsultaRecursos {
  seccion?: SeccionFormativa
  area?: AreaHabilidad
  tipos?: readonly TipoRecurso[]
  texto?: string
  pagina?: number
  porPagina?: number
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

// ---- Público ----

function aQuery(consulta: ConsultaRecursos): string {
  const params = new URLSearchParams()
  if (consulta.seccion) params.set('seccion', consulta.seccion)
  if (consulta.area) params.set('area', consulta.area)
  if (consulta.tipos?.length) params.set('tipo', consulta.tipos.join(','))
  if (consulta.texto) params.set('q', consulta.texto)
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
  consulta: Pick<ConsultaRecursos, 'pagina' | 'porPagina'> = {},
): Promise<PaginaDe<RecursoAdmin>> {
  return pedir<PaginaDe<RecursoAdmin>>(
    `/api/admin/recursos${aQuery(consulta)}`,
    'No pudimos cargar los recursos. Intenta de nuevo.',
  )
}

export async function obtenerRecursoAdmin(idRecurso: string): Promise<RecursoAdmin> {
  const { recurso } = await pedir<{ recurso: RecursoAdmin }>(
    `/api/admin/recursos/${encodeURIComponent(idRecurso)}`,
    'No pudimos cargar el recurso. Intenta de nuevo.',
  )
  return recurso
}

export async function crearRecurso(datos: Partial<DatosRecurso>): Promise<RecursoAdmin> {
  const { recurso } = await pedir<{ recurso: RecursoAdmin }>(
    '/api/admin/recursos',
    'No pudimos crear el recurso. Revisa los campos e intenta de nuevo.',
    json('POST', datos),
  )
  return recurso
}

export async function actualizarRecurso(
  idRecurso: string,
  cambios: Partial<DatosRecurso>,
): Promise<RecursoAdmin> {
  const { recurso } = await pedir<{ recurso: RecursoAdmin }>(
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

export async function subirArchivoRecurso(idRecurso: string, archivo: File): Promise<RecursoAdmin> {
  const { recurso } = await pedir<{ recurso: RecursoAdmin }>(
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

export async function quitarArchivoRecurso(idRecurso: string): Promise<RecursoAdmin> {
  const { recurso } = await pedir<{ recurso: RecursoAdmin }>(
    `/api/admin/recursos/${encodeURIComponent(idRecurso)}/archivo`,
    'No pudimos quitar el archivo. Intenta de nuevo.',
    { method: 'DELETE' },
  )
  return recurso
}
