import type { CategoriaInsignia, FuenteOtorgamiento } from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorInsignias extends Error {
  readonly detallePorCampo?: Record<string, string>

  constructor(mensaje: string, detallePorCampo?: Record<string, string>) {
    super(mensaje)
    this.detallePorCampo = detallePorCampo
  }
}

const MENSAJE_SIN_CONEXION =
  'No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.'

async function leerError(respuesta: Response, porDefecto: string): Promise<ErrorInsignias> {
  try {
    const cuerpo = (await respuesta.json()) as { mensaje?: unknown; detallePorCampo?: unknown }
    const mensaje =
      typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim() ? cuerpo.mensaje : porDefecto
    const detalle =
      cuerpo.detallePorCampo && typeof cuerpo.detallePorCampo === 'object'
        ? (cuerpo.detallePorCampo as Record<string, string>)
        : undefined
    return new ErrorInsignias(mensaje, detalle)
  } catch {
    return new ErrorInsignias(porDefecto)
  }
}

async function pedir(ruta: string, opciones: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${ruta}`, { credentials: 'include', ...opciones })
  } catch {
    throw new ErrorInsignias(MENSAJE_SIN_CONEXION)
  }
}

export interface Companero {
  idMembresia: string
  nombre: string
}

export interface ContextoReconocimiento {
  actividad: { id: string; nombre: string }
  rol: 'organizador' | 'co-organizador' | 'participante'
  idMembresiaActor: string
  companeros: Companero[]
  presupuesto: number | null
  fechaLimite: string
  abierto: boolean
  aplicados: boolean
}

export interface ReconocimientoPropio {
  idMembresiaReceptor: string
  categoria: CategoriaInsignia
  frase: string
}

export interface ReconocimientoRecibido {
  categoria: CategoriaInsignia
  frase: string
  puntos: number
  fuente: FuenteOtorgamiento
}

export interface ReconocimientoRecibidoConAutor extends ReconocimientoRecibido {
  otorgadoPor: string | null
}

/** Lo recibido visto desde el perfil: cruza actividades, así que cada frase
 * dice de cuál salió. Sigue sin autor. */
export interface ReconocimientoEnPerfil extends ReconocimientoRecibido {
  fecha: string
  actividad: { id: string; nombre: string }
}

export async function obtenerRitual(
  idActividad: string,
): Promise<{ contexto: ContextoReconocimiento; reconocimientos: ReconocimientoPropio[] }> {
  const r = await pedir(`/api/actividades/${idActividad}/reconocimientos`)
  if (!r.ok) throw await leerError(r, 'No pudimos cargar el ritual de reconocimiento.')
  return r.json()
}

export async function guardarReconocimientos(
  idActividad: string,
  reconocimientos: ReconocimientoPropio[],
): Promise<ReconocimientoPropio[]> {
  const r = await pedir(`/api/actividades/${idActividad}/reconocimientos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reconocimientos }),
  })
  if (!r.ok) throw await leerError(r, 'No pudimos guardar tus reconocimientos.')
  const cuerpo = (await r.json()) as { reconocimientos: ReconocimientoPropio[] }
  return cuerpo.reconocimientos
}

export async function obtenerRecibidos(
  idActividad: string,
): Promise<{ aplicados: boolean; fechaLimite: string; reconocimientos: ReconocimientoRecibido[] }> {
  const r = await pedir(`/api/actividades/${idActividad}/reconocimientos/recibidos`)
  if (!r.ok) throw await leerError(r, 'No pudimos cargar tus reconocimientos.')
  return r.json()
}

export async function obtenerRecibidosDeParticipante(
  idActividad: string,
  idMembresia: string,
): Promise<{
  participante: Companero
  reconocimientos: ReconocimientoRecibidoConAutor[]
}> {
  const r = await pedir(
    `/api/actividades/${idActividad}/participantes/${idMembresia}/reconocimientos`,
  )
  if (!r.ok) throw await leerError(r, 'No pudimos cargar los reconocimientos de esta persona.')
  return r.json()
}

export async function obtenerAcumulado(): Promise<Partial<Record<CategoriaInsignia, number>>> {
  const r = await pedir('/api/insignias/acumulado')
  if (!r.ok) throw await leerError(r, 'No pudimos cargar tu acumulado.')
  const cuerpo = (await r.json()) as { acumulado: Partial<Record<CategoriaInsignia, number>> }
  return cuerpo.acumulado
}

export async function obtenerRecibidosEnPerfil(): Promise<ReconocimientoEnPerfil[]> {
  const r = await pedir('/api/insignias/recibidos')
  if (!r.ok) throw await leerError(r, 'No pudimos cargar tus reconocimientos.')
  const cuerpo = (await r.json()) as { reconocimientos: ReconocimientoEnPerfil[] }
  return cuerpo.reconocimientos
}
