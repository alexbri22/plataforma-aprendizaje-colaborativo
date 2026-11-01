import {
  EXTENSIONES_ARCHIVO_ELEMENTO,
  MAX_BYTES_ARCHIVO_ELEMENTO,
  esTipoArchivoElemento,
  type ElementoDeEspacioEquipo,
  type ElementoEspacioEquipo,
} from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorElemento extends Error {}

const MENSAJE_SIN_CONEXION = 'No pudimos comunicarnos con Co3. Intenta de nuevo en un momento.'

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
  enlace: string | null,
): Promise<ElementoDeEspacioEquipo> {
  const respuesta = await exigirOk(
    await pedir(`/api/equipos/${encodeURIComponent(idEquipo)}/elementos`, 'POST', {
      tipo,
      contenido,
      enlace,
    }),
    'No pudimos guardar esto. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { elemento: ElementoDeEspacioEquipo }).elemento
}

// PATCH /api/elementos/{id}.
export async function editarElemento(
  idElemento: string,
  contenido: string,
  enlace: string | null,
): Promise<ElementoDeEspacioEquipo> {
  const respuesta = await exigirOk(
    await pedir(`/api/elementos/${encodeURIComponent(idElemento)}`, 'PATCH', {
      contenido,
      enlace,
    }),
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

// ---- Archivo adjunto ----

/** El tipo del archivo: el que da el navegador o, si no lo da (pasa con
 * documentos de Office en algunos sistemas), el de su extensión. */
export function tipoDeArchivo(archivo: File): string {
  if (archivo.type) return archivo.type
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? ''
  return (EXTENSIONES_ARCHIVO_ELEMENTO as Record<string, string>)[extension] ?? ''
}

/** El motivo por el que no se puede adjuntar, o null. Se revisa antes de
 * enviarlo para no subir 4 MB y enterarse después; el servidor lo repite. */
export function problemaConArchivo(archivo: File): string | null {
  if (!esTipoArchivoElemento(tipoDeArchivo(archivo))) {
    return 'Solo se admiten PDF, imágenes y documentos de Office.'
  }
  if (archivo.size > MAX_BYTES_ARCHIVO_ELEMENTO) {
    return 'El archivo pesa más de 4 MB. Súbelo a Drive y pega el enlace.'
  }
  return null
}

export function urlArchivoElemento(idElemento: string): string {
  return `${BASE_URL}/api/elementos/${encodeURIComponent(idElemento)}/archivo`
}

export async function subirArchivoElemento(
  idElemento: string,
  archivo: File,
): Promise<ElementoDeEspacioEquipo> {
  let respuesta: Response
  try {
    respuesta = await fetch(urlArchivoElemento(idElemento), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': tipoDeArchivo(archivo),
        'X-Nombre-Archivo': encodeURIComponent(archivo.name),
      },
      body: archivo,
    })
  } catch {
    throw new ErrorElemento(MENSAJE_SIN_CONEXION)
  }
  await exigirOk(respuesta, 'No pudimos subir el archivo. Intenta de nuevo.')
  return ((await respuesta.json()) as { elemento: ElementoDeEspacioEquipo }).elemento
}

export async function quitarArchivoElemento(idElemento: string): Promise<void> {
  await exigirOk(
    await pedir(`/api/elementos/${encodeURIComponent(idElemento)}/archivo`, 'DELETE'),
    'No pudimos quitar el archivo. Intenta de nuevo.',
  )
}
