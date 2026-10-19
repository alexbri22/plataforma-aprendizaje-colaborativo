import type { PaginaHistorial } from '@plataforma/shared'

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
// cronológica mínima de este incremento, paginada por cursor (nucleo §3.1).
// cursor es el id del último evento de la página anterior; sin él, trae la
// primera página. idEquipo (opcional) acota la vista a ese equipo —
// entrypoint de Historial en el espacio de equipo (AppShellEquipo).
export async function obtenerHistorial(
  idActividad: string,
  cursor?: string,
  idEquipo?: string,
): Promise<PaginaHistorial> {
  const parametros = new URLSearchParams()
  if (cursor) parametros.set('cursor', cursor)
  if (idEquipo) parametros.set('idEquipo', idEquipo)
  const query = parametros.toString() ? `?${parametros.toString()}` : ''
  let respuesta: Response
  try {
    respuesta = await fetch(
      `${BASE_URL}/api/actividades/${encodeURIComponent(idActividad)}/historial${query}`,
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

  return (await respuesta.json()) as PaginaHistorial
}
