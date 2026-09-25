import type { Equipo, ListaEquipos, PropuestaEquipos } from '@plataforma/shared'
import type { Actividad } from '../actividades'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorEquipos extends Error {}

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
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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
    throw new ErrorEquipos(MENSAJE_SIN_CONEXION)
  }
}

async function exigirOk(respuesta: Response, mensajePorDefecto: string): Promise<Response> {
  if (!respuesta.ok) throw new ErrorEquipos(await leerMensajeError(respuesta, mensajePorDefecto))
  return respuesta
}

const idActividadEnRuta = encodeURIComponent

// GET /api/actividades/{id}/equipos (docs/diseno-desarrollo-nucleo.md §8.6).
export async function obtenerEquipos(idActividad: string): Promise<ListaEquipos> {
  const respuesta = await exigirOk(
    await pedir(`/api/actividades/${idActividadEnRuta(idActividad)}/equipos`, 'GET'),
    'No pudimos cargar los equipos.',
  )
  return (await respuesta.json()) as ListaEquipos
}

// POST /api/actividades/{id}/equipos.
export async function crearEquipo(idActividad: string, nombre: string): Promise<Equipo> {
  const respuesta = await exigirOk(
    await pedir(`/api/actividades/${idActividadEnRuta(idActividad)}/equipos`, 'POST', { nombre }),
    'No pudimos crear el equipo. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { equipo: Equipo }).equipo
}

// PUT /api/equipos/{id}/integrantes/{idMembresia}: asigna o mueve.
export async function asignarIntegrante(idEquipo: string, idMembresia: string): Promise<Equipo> {
  const respuesta = await exigirOk(
    await pedir(
      `/api/equipos/${encodeURIComponent(idEquipo)}/integrantes/${encodeURIComponent(idMembresia)}`,
      'PUT',
    ),
    'No pudimos asignar a esta persona. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { equipo: Equipo }).equipo
}

// DELETE /api/equipos/{id}/integrantes/{idMembresia}: solo quien organiza o
// co-organiza sale de un equipo; un participante se mueve, no se retira.
export async function retirarIntegrante(idEquipo: string, idMembresia: string): Promise<Equipo> {
  const respuesta = await exigirOk(
    await pedir(
      `/api/equipos/${encodeURIComponent(idEquipo)}/integrantes/${encodeURIComponent(idMembresia)}`,
      'DELETE',
    ),
    'No pudimos sacar a esta persona del equipo. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { equipo: Equipo }).equipo
}

export interface CambiosEquipo {
  nombre?: string
  descripcionActividad?: string | null
  formaDeTrabajo?: string | null
}

// PATCH /api/equipos/{id}.
export async function editarEquipo(idEquipo: string, cambios: CambiosEquipo): Promise<Equipo> {
  const respuesta = await exigirOk(
    await pedir(`/api/equipos/${encodeURIComponent(idEquipo)}`, 'PATCH', cambios),
    'No pudimos guardar los cambios del equipo. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { equipo: Equipo }).equipo
}

// DELETE /api/equipos/{id}: solo un equipo vacío.
export async function eliminarEquipo(idEquipo: string): Promise<void> {
  await exigirOk(
    await pedir(`/api/equipos/${encodeURIComponent(idEquipo)}`, 'DELETE'),
    'No pudimos eliminar el equipo. Intenta de nuevo.',
  )
}

// POST /api/actividades/{id}/formacion/cierre: cierra la formación, con
// reparto automático de quienes quedaron sin equipo.
export async function cerrarFormacion(idActividad: string): Promise<Actividad> {
  const respuesta = await exigirOk(
    await pedir(`/api/actividades/${idActividadEnRuta(idActividad)}/formacion/cierre`, 'POST'),
    'No pudimos cerrar la formación de equipos. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { actividad: Actividad }).actividad
}

// POST /api/actividades/{id}/equipos/propuesta: la propuesta del sistema, ya
// materializada como equipos normales en formación. Regenerar reemplaza los
// equipos anteriores.
export async function generarPropuesta(idActividad: string): Promise<PropuestaEquipos> {
  const respuesta = await exigirOk(
    await pedir(`/api/actividades/${idActividadEnRuta(idActividad)}/equipos/propuesta`, 'POST'),
    'No pudimos generar la propuesta de equipos. Intenta de nuevo.',
  )
  return (await respuesta.json()) as PropuestaEquipos
}
