import { INVITACIONES_PRUEBA } from './actividades.fixtures'
import type { Actividad, InvitacionPendiente, VistaPreviaActividad } from './tipos'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorActividad extends Error {}

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

async function pedir(ruta: string, opciones: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${ruta}`, {
      // La sesión viaja como cookie httpOnly (docs/diseno-desarrollo-nucleo.md
      // §3.2), no como token en el cuerpo de la respuesta.
      credentials: 'include',
      ...opciones,
    })
  } catch {
    throw new ErrorActividad(MENSAJE_SIN_CONEXION)
  }
}

function enviar(ruta: string, datos: unknown): Promise<Response> {
  return pedir(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
}

// GET /api/actividades (docs/diseno-desarrollo-nucleo.md §7.7): actividades
// donde el actor tiene membresía, con su rol en cada una.
export async function obtenerActividades(): Promise<Actividad[]> {
  const respuesta = await pedir('/api/actividades')

  if (!respuesta.ok) {
    throw new ErrorActividad(
      await leerMensajeError(respuesta, 'No pudimos cargar tus actividades.'),
    )
  }

  const { actividades } = (await respuesta.json()) as { actividades: Actividad[] }
  return actividades
}

// No existe GET /api/actividades/{id} en este incremento (fuera de alcance:
// docs/diseno-desarrollo-nucleo.md §11.2, "Actividades I" solo cubre crear y
// listar). Se deriva del listado para no bloquear PantallaResumenActividad,
// que ya depende de esta función.
export async function obtenerActividad(id: string): Promise<Actividad> {
  const actividades = await obtenerActividades()
  const actividad = actividades.find((item) => item.id === id)
  if (!actividad) throw new ErrorActividad('No encontramos esta actividad.')
  return actividad
}

export async function obtenerInvitaciones(): Promise<InvitacionPendiente[]> {
  return invitaciones
}

// Campos de docs/diseno-desarrollo-general.md §5.1 (relación 'actividades').
// docs/diseno-desarrollo-nucleo.md §7.1 solo exige nombre y objetivo — el
// resto es obligatorio aquí por decisión de producto (ver la nota en
// docs/diseno-desarrollo-general.md §5.1, "Decisión de producto — creación
// con todos los campos y clave desde el origen").
export interface DatosCrearActividad {
  nombre: string
  objetivo: string
  informacionGeneral: string
  fechaInicio: string
  fechaTermino: string
  fechaLimiteInscripcion: string
  plazoCierreDias: number
  numeroEquiposEsperado: number
  // Autopercepción de quien organiza sobre cuánta libertad piensa ceder, a
  // lo más una opción. No configura ninguna función de seguimiento ni
  // existe en el diccionario de datos: es un campo de telemetría, pendiente
  // de confirmación de alcance en la reunión de equipo. El servidor lo
  // acepta si llega, pero no lo valida ni lo persiste. No debe
  // interpretarse como el modo de gestión de la actividad — esa idea se
  // descartó explícitamente en concepto-producto.md §1 a favor de
  // configurar cada función por separado.
  tipoActividadPercibida?: string
}

// POST /api/actividades (docs/diseno-desarrollo-nucleo.md §7.7): crea la
// actividad y la membresía de organizador. El servidor genera la clave de
// ingreso con un generador criptográficamente seguro (a diferencia de este
// cliente, que no genera nada).
export async function crearActividad(datos: DatosCrearActividad): Promise<Actividad> {
  const respuesta = await enviar('/api/actividades', datos)

  if (!respuesta.ok) {
    throw new ErrorActividad(
      await leerMensajeError(respuesta, 'No pudimos crear la actividad. Intenta de nuevo.'),
    )
  }

  const { actividad } = (await respuesta.json()) as { actividad: Actividad }
  return actividad
}

// GET /api/claves/{clave} (docs/diseno-desarrollo-nucleo.md §7.7): vista
// previa mínima, sin exigir membresía. Es la única ruta de la API que no
// cuelga de /actividades (§3.3), de ahí la ruta distinta.
export async function buscarActividadPorClave(clave: string): Promise<VistaPreviaActividad> {
  const respuesta = await pedir(`/api/claves/${encodeURIComponent(clave)}`)

  if (!respuesta.ok) {
    throw new ErrorActividad(
      await leerMensajeError(respuesta, 'Esta clave no corresponde a ninguna actividad.'),
    )
  }

  return (await respuesta.json()) as VistaPreviaActividad
}

// POST /api/claves/{clave}/union: se une como participante. Sin cuerpo: la
// clave va en la ruta y el actor lo resuelve la sesión.
export async function unirseConClave(clave: string): Promise<Actividad> {
  const respuesta = await pedir(`/api/claves/${encodeURIComponent(clave)}/union`, {
    method: 'POST',
  })

  if (!respuesta.ok) {
    throw new ErrorActividad(
      await leerMensajeError(respuesta, 'No pudimos unirte a esta actividad. Intenta de nuevo.'),
    )
  }

  const { actividad } = (await respuesta.json()) as { actividad: Actividad }
  return actividad
}

// Invitaciones: sin backend en este incremento (docs/diseno-desarrollo-nucleo.md
// §11.2 deja las invitaciones fuera de "Actividades I"). Se mantienen
// mockeadas en memoria hasta que ese endpoint exista.
let invitaciones: InvitacionPendiente[] = [...INVITACIONES_PRUEBA]

export async function aceptarInvitacion(id: string): Promise<Actividad> {
  const invitacion = invitaciones.find((item) => item.id === id)
  if (!invitacion) throw new ErrorActividad('La invitación ya no está disponible.')

  invitaciones = invitaciones.filter((item) => item.id !== id)
  return {
    id: invitacion.id,
    nombre: invitacion.nombre,
    objetivo: invitacion.objetivo,
    fase: 'inscripcion',
    rol: 'participante',
    numParticipantes: 0,
    fechaClave: 'Te uniste recién',
  }
}

export async function rechazarInvitacion(id: string): Promise<void> {
  invitaciones = invitaciones.filter((item) => item.id !== id)
}
