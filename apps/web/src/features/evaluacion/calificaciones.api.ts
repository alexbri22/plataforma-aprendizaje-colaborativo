import type {
  CalificacionDeParticipante,
  DesgloseCalificacion,
  ProyectoDeEquipo,
} from '@plataforma/shared'
import { ErrorPonderacion } from './ponderacion.api'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''
const MENSAJE_SIN_CONEXION = 'No pudimos comunicarnos con Co3. Intenta de nuevo en un momento.'

// El mensaje del servidor, o el primero de su detalle por campo.
async function mensajeDe(respuesta: Response, porDefecto: string): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as {
      mensaje?: unknown
      detallePorCampo?: Record<string, unknown>
    }
    const delDetalle = Object.values(cuerpo.detallePorCampo ?? {}).find(
      (v) => typeof v === 'string',
    )
    if (typeof delDetalle === 'string') return delDetalle
    if (typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim()) return cuerpo.mensaje
  } catch {
    // sin cuerpo JSON: el mensaje por defecto
  }
  return porDefecto
}

async function pedir(
  ruta: string,
  metodo: 'GET' | 'PUT',
  porDefecto: string,
  cuerpo?: unknown,
): Promise<Response> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      credentials: 'include',
      ...(cuerpo === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
    })
  } catch {
    throw new ErrorPonderacion(MENSAJE_SIN_CONEXION)
  }
  if (!respuesta.ok) throw new ErrorPonderacion(await mensajeDe(respuesta, porDefecto))
  return respuesta
}

const actividad = (id: string) => `/api/actividades/${encodeURIComponent(id)}`

// GET /api/actividades/{id}/calificaciones (nucleo §10.5): para quien organiza.
export async function obtenerCalificaciones(
  idActividad: string,
): Promise<CalificacionDeParticipante[]> {
  const respuesta = await pedir(
    `${actividad(idActividad)}/calificaciones`,
    'GET',
    'No pudimos cargar las calificaciones.',
  )
  return ((await respuesta.json()) as { calificaciones: CalificacionDeParticipante[] })
    .calificaciones
}

// GET .../calificaciones/{idMembresia}: el desglose de una persona.
export async function obtenerDesglose(
  idActividad: string,
  idMembresia: string,
): Promise<DesgloseCalificacion> {
  const respuesta = await pedir(
    `${actividad(idActividad)}/calificaciones/${encodeURIComponent(idMembresia)}`,
    'GET',
    'No pudimos cargar la calificación.',
  )
  return ((await respuesta.json()) as { desglose: DesgloseCalificacion }).desglose
}

// GET .../calificaciones/proyecto: para la captura por equipo.
export async function obtenerProyectoPorEquipo(idActividad: string): Promise<ProyectoDeEquipo[]> {
  const respuesta = await pedir(
    `${actividad(idActividad)}/calificaciones/proyecto`,
    'GET',
    'No pudimos cargar el proyecto de los equipos.',
  )
  return ((await respuesta.json()) as { equipos: ProyectoDeEquipo[] }).equipos
}

// PUT .../instrumentos/{id}/puntajes/{idMembresia}: null lo retira.
export async function capturarPuntaje(
  idActividad: string,
  idInstrumento: string,
  idMembresia: string,
  valor: number | null,
): Promise<void> {
  await pedir(
    `${actividad(idActividad)}/instrumentos/${encodeURIComponent(idInstrumento)}/puntajes/${encodeURIComponent(idMembresia)}`,
    'PUT',
    'No pudimos guardar el puntaje.',
    { valor },
  )
}

// PUT .../instrumentos/{id}/puntajes/equipos/{idEquipo}: el proyecto de todo
// el equipo.
export async function capturarPuntajeDeEquipo(
  idActividad: string,
  idInstrumento: string,
  idEquipo: string,
  valor: number | null,
): Promise<void> {
  await pedir(
    `${actividad(idActividad)}/instrumentos/${encodeURIComponent(idInstrumento)}/puntajes/equipos/${encodeURIComponent(idEquipo)}`,
    'PUT',
    'No pudimos guardar el puntaje del equipo.',
    { valor },
  )
}
