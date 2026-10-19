import type { EntradaBitacora } from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorBitacora extends Error {}

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

async function pedir(
  ruta: string,
  metodo: 'GET' | 'POST' | 'PATCH',
  cuerpo?: unknown,
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      credentials: 'include',
      ...(cuerpo === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
    })
  } catch {
    throw new ErrorBitacora(MENSAJE_SIN_CONEXION)
  }
}

async function exigirOk(respuesta: Response, mensajePorDefecto: string): Promise<Response> {
  if (!respuesta.ok) throw new ErrorBitacora(await leerMensajeError(respuesta, mensajePorDefecto))
  return respuesta
}

// GET /api/actividades/{id}/bitacora (nucleo §9.4). Sin idMembresia, las
// propias; con ella, las de otro participante (solo quien organiza o
// co-organiza con `leer_bitacoras`).
export async function obtenerBitacora(
  idActividad: string,
  idMembresia?: string,
): Promise<EntradaBitacora[]> {
  const query = idMembresia ? `?idMembresia=${encodeURIComponent(idMembresia)}` : ''
  const respuesta = await exigirOk(
    await pedir(`/api/actividades/${encodeURIComponent(idActividad)}/bitacora${query}`, 'GET'),
    'No pudimos cargar la bitácora.',
  )
  return ((await respuesta.json()) as { entradas: EntradaBitacora[] }).entradas
}

// POST /api/actividades/{id}/bitacora.
export async function crearEntradaBitacora(
  idActividad: string,
  contenido: string,
): Promise<EntradaBitacora> {
  const respuesta = await exigirOk(
    await pedir(`/api/actividades/${encodeURIComponent(idActividad)}/bitacora`, 'POST', {
      contenido,
    }),
    'No pudimos guardar la entrada. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { entrada: EntradaBitacora }).entrada
}

// PATCH /api/bitacora/{id}.
export async function editarEntradaBitacora(
  idEntrada: string,
  contenido: string,
): Promise<EntradaBitacora> {
  const respuesta = await exigirOk(
    await pedir(`/api/bitacora/${encodeURIComponent(idEntrada)}`, 'PATCH', { contenido }),
    'No pudimos guardar los cambios. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { entrada: EntradaBitacora }).entrada
}
