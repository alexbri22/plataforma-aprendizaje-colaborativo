import type { Comentario } from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorComentario extends Error {}

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
    throw new ErrorComentario(MENSAJE_SIN_CONEXION)
  }
}

async function exigirOk(respuesta: Response, mensajePorDefecto: string): Promise<Response> {
  if (!respuesta.ok) throw new ErrorComentario(await leerMensajeError(respuesta, mensajePorDefecto))
  return respuesta
}

// GET/POST /api/elementos/{id}/comentarios (nucleo §9.4, §10.4).
export async function obtenerComentariosDeElemento(idElemento: string): Promise<Comentario[]> {
  const respuesta = await exigirOk(
    await pedir(`/api/elementos/${encodeURIComponent(idElemento)}/comentarios`, 'GET'),
    'No pudimos cargar los comentarios.',
  )
  return ((await respuesta.json()) as { comentarios: Comentario[] }).comentarios
}

export async function crearComentarioSobreElemento(
  idElemento: string,
  contenido: string,
): Promise<Comentario> {
  const respuesta = await exigirOk(
    await pedir(`/api/elementos/${encodeURIComponent(idElemento)}/comentarios`, 'POST', {
      contenido,
    }),
    'No pudimos guardar el comentario. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { comentario: Comentario }).comentario
}

// GET/POST /api/bitacora/{id}/comentarios.
export async function obtenerComentariosDeEntrada(idEntrada: string): Promise<Comentario[]> {
  const respuesta = await exigirOk(
    await pedir(`/api/bitacora/${encodeURIComponent(idEntrada)}/comentarios`, 'GET'),
    'No pudimos cargar los comentarios.',
  )
  return ((await respuesta.json()) as { comentarios: Comentario[] }).comentarios
}

export async function crearComentarioSobreEntrada(
  idEntrada: string,
  contenido: string,
): Promise<Comentario> {
  const respuesta = await exigirOk(
    await pedir(`/api/bitacora/${encodeURIComponent(idEntrada)}/comentarios`, 'POST', {
      contenido,
    }),
    'No pudimos guardar el comentario. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { comentario: Comentario }).comentario
}

// PATCH /api/comentarios/{id}.
export async function editarComentario(
  idComentario: string,
  contenido: string,
): Promise<Comentario> {
  const respuesta = await exigirOk(
    await pedir(`/api/comentarios/${encodeURIComponent(idComentario)}`, 'PATCH', { contenido }),
    'No pudimos guardar los cambios. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { comentario: Comentario }).comentario
}
