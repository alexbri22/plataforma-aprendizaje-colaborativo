import type { IdPista } from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorAyuda extends Error {}

async function pedir(ruta: string, metodo: 'GET' | 'PUT' | 'DELETE'): Promise<Response> {
  const respuesta = await fetch(`${BASE_URL}/api/usuarios/yo/pistas${ruta}`, {
    method: metodo,
    credentials: 'include',
  })
  if (!respuesta.ok) throw new ErrorAyuda('No pudimos guardar tus ayudas.')
  return respuesta
}

// GET /api/usuarios/yo/pistas: qué ayudas de primera vez ya vio la persona.
export async function obtenerPistasVistas(): Promise<IdPista[]> {
  const respuesta = await pedir('', 'GET')
  return ((await respuesta.json()) as { pistas: IdPista[] }).pistas
}

export async function marcarPistaVista(idPista: IdPista): Promise<void> {
  await pedir(`/${encodeURIComponent(idPista)}`, 'PUT')
}

export async function reiniciarPistas(): Promise<void> {
  await pedir('', 'DELETE')
}
