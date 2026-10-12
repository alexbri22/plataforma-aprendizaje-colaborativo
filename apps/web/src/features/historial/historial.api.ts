import type { EventoHistorial } from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorHistorial extends Error {}

const MENSAJE_SIN_CONEXION =
  'No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.'

async function leerMensajeError(respuesta: Response, mensajePorDefecto: string): Promise<string> {
  try {
    const cuerpo: unknown = await respuesta.json()
    if (cuerpo && typeof cuerpo === 'object' && 'mensaje' in cuerpo) {
      const { mensaje } = cuerpo as { mensaje: unknown }
      if (typeof mensaje === 'string' && mensaje.trim()) return mensaje
    }
  } catch {
    // el cuerpo no es JSON válido o está vacío; usamos el mensaje por defecto
  }
  return mensajePorDefecto
}

// GET /api/actividades/{id}/historial (nucleo §5.5, §11.2): consulta
// cronológica mínima de este incremento, sin filtros (Fase B).
export async function obtenerHistorial(idActividad: string): Promise<EventoHistorial[]> {
  let respuesta: Response
  try {
    respuesta = await fetch(
      `${BASE_URL}/api/actividades/${encodeURIComponent(idActividad)}/historial`,
      {
        credentials: 'include',
      },
    )
  } catch {
    throw new ErrorHistorial(MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorHistorial(await leerMensajeError(respuesta, 'No pudimos cargar el historial.'))
  }

  return ((await respuesta.json()) as { eventos: EventoHistorial[] }).eventos
}
