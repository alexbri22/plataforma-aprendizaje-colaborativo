import type { ElementoDeEspacioEquipo, ElementoEspacioEquipo } from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorElemento extends Error {}

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
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  cuerpo?: unknown,
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      // La sesión viaja como cookie httpOnly (docs/diseno-desarrollo-nucleo.md §3.2).
      credentials: 'include',
      ...(cuerpo === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
    })
  } catch {
    throw new ErrorElemento(MENSAJE_SIN_CONEXION)
  }
}

async function exigirOk(respuesta: Response, mensajePorDefecto: string): Promise<Response> {
  if (!respuesta.ok) throw new ErrorElemento(await leerMensajeError(respuesta, mensajePorDefecto))
  return respuesta
}

// GET /api/equipos/{id}/elementos (nucleo §9.4), filtrable por tipo.
export async function obtenerElementos(
  idEquipo: string,
  tipo: ElementoEspacioEquipo,
): Promise<ElementoDeEspacioEquipo[]> {
  const respuesta = await exigirOk(
    await pedir(`/api/equipos/${encodeURIComponent(idEquipo)}/elementos?tipo=${tipo}`, 'GET'),
    'No pudimos cargar el espacio de equipo.',
  )
  return ((await respuesta.json()) as { elementos: ElementoDeEspacioEquipo[] }).elementos
}

// POST /api/equipos/{id}/elementos.
export async function crearElemento(
  idEquipo: string,
  tipo: ElementoEspacioEquipo,
  contenido: string,
): Promise<ElementoDeEspacioEquipo> {
  const respuesta = await exigirOk(
    await pedir(`/api/equipos/${encodeURIComponent(idEquipo)}/elementos`, 'POST', {
      tipo,
      contenido,
    }),
    'No pudimos guardar esto. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { elemento: ElementoDeEspacioEquipo }).elemento
}

// PATCH /api/elementos/{id}.
export async function editarElemento(
  idElemento: string,
  contenido: string,
): Promise<ElementoDeEspacioEquipo> {
  const respuesta = await exigirOk(
    await pedir(`/api/elementos/${encodeURIComponent(idElemento)}`, 'PATCH', { contenido }),
    'No pudimos guardar los cambios. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { elemento: ElementoDeEspacioEquipo }).elemento
}

// DELETE /api/elementos/{id}: el servidor conserva el contenido en el historial.
export async function eliminarElemento(idElemento: string): Promise<void> {
  await exigirOk(
    await pedir(`/api/elementos/${encodeURIComponent(idElemento)}`, 'DELETE'),
    'No pudimos eliminar esto. Intenta de nuevo.',
  )
}
