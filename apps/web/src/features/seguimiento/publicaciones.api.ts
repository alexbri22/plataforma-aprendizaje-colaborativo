import type { PublicacionDeProyecto, PublicacionesDeActividad } from '@plataforma/shared'
import { tipoDeArchivo } from './elementos.api'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''
const MENSAJE_SIN_CONEXION = 'No pudimos comunicarnos con Co3. Intenta de nuevo en un momento.'

export class ErrorPublicacion extends Error {}

async function mensajeDe(respuesta: Response, porDefecto: string): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { mensaje?: unknown; detallePorCampo?: unknown }
    if (cuerpo.detallePorCampo && typeof cuerpo.detallePorCampo === 'object') {
      const primero = Object.values(cuerpo.detallePorCampo as Record<string, unknown>)[0]
      if (typeof primero === 'string') return primero
    }
    if (typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim()) return cuerpo.mensaje
  } catch {
    // sin cuerpo JSON: se usa el mensaje por defecto
  }
  return porDefecto
}

async function pedir(ruta: string, init: RequestInit, porDefecto: string): Promise<Response> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, { credentials: 'include', ...init })
  } catch {
    throw new ErrorPublicacion(MENSAJE_SIN_CONEXION)
  }
  if (!respuesta.ok) throw new ErrorPublicacion(await mensajeDe(respuesta, porDefecto))
  return respuesta
}

function ruta(idActividad: string): string {
  return `/api/actividades/${encodeURIComponent(idActividad)}/publicaciones`
}

export function urlArchivoPublicacion(idActividad: string, idPublicacion: string): string {
  return `${BASE_URL}${ruta(idActividad)}/${encodeURIComponent(idPublicacion)}/archivo`
}

export async function obtenerPublicaciones(idActividad: string): Promise<PublicacionesDeActividad> {
  const respuesta = await pedir(ruta(idActividad), {}, 'No pudimos cargar los proyectos.')
  return (await respuesta.json()) as PublicacionesDeActividad
}

export async function guardarPublicacion(
  idActividad: string,
  datos: { descripcion: string; enlace: string | null },
): Promise<PublicacionDeProyecto> {
  const respuesta = await pedir(
    ruta(idActividad),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    },
    'No pudimos publicar el proyecto. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { publicacion: PublicacionDeProyecto }).publicacion
}

export async function subirArchivoPublicacion(idActividad: string, archivo: File): Promise<void> {
  await pedir(
    `${ruta(idActividad)}/archivo`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': tipoDeArchivo(archivo),
        'X-Nombre-Archivo': encodeURIComponent(archivo.name),
      },
      body: archivo,
    },
    'No pudimos subir el archivo. Intenta de nuevo.',
  )
}

export async function quitarArchivoPublicacion(idActividad: string): Promise<void> {
  await pedir(
    `${ruta(idActividad)}/archivo`,
    { method: 'DELETE' },
    'No pudimos quitar el archivo. Intenta de nuevo.',
  )
}
