import type { TipoCuenta } from '../cuentas/api'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export type EstadoCuenta = 'activa' | 'desactivada'

export interface CuentaAdmin {
  idUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  correo: string
  tipoCuenta: TipoCuenta
  estadoCuenta: EstadoCuenta
  fechaRegistro: string
}

export class ErrorAdmin extends Error {}

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

// GET /api/admin/usuarios (docs/diseno-desarrollo-nucleo.md §6.5). La cookie de
// sesión viaja como httpOnly con credentials: 'include'. La autorización es del
// servidor (exigirAdministrador); aquí solo consumimos la respuesta.
export async function listarCuentas(): Promise<CuentaAdmin[]> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE_URL}/api/admin/usuarios`, { credentials: 'include' })
  } catch {
    throw new ErrorAdmin(MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorAdmin(
      await leerMensajeError(respuesta, 'No pudimos cargar las cuentas. Intenta de nuevo.'),
    )
  }

  const cuerpo: unknown = await respuesta.json()
  if (cuerpo && typeof cuerpo === 'object' && 'usuarios' in cuerpo) {
    return (cuerpo as { usuarios: CuentaAdmin[] }).usuarios
  }
  return []
}

// POST /api/admin/usuarios/{id}/contrasena (docs/diseno-desarrollo-nucleo.md
// §6.5): restablece la contraseña. El servidor cierra las sesiones del usuario
// afectado.
export async function restablecerContrasena(idUsuario: string, contrasena: string): Promise<void> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE_URL}/api/admin/usuarios/${idUsuario}/contrasena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contrasena }),
    })
  } catch {
    throw new ErrorAdmin(MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorAdmin(
      await leerMensajeError(respuesta, 'No pudimos restablecer la contraseña. Intenta de nuevo.'),
    )
  }
}

/** Solicitud de cambio de nombre pendiente: el nombre actual de la cuenta y el
 * que pide (docs/diseno-desarrollo-nucleo.md §6.3). */
export interface SolicitudNombreAdmin {
  idSolicitud: string
  creadaEn: string
  solicitado: { nombre: string; apellidoPaterno: string; apellidoMaterno: string }
  usuario: {
    idUsuario: string
    nombre: string
    apellidoPaterno: string
    apellidoMaterno: string
    correo: string
  }
}

// GET /api/admin/solicitudes-nombre: las pendientes, de la más antigua a la
// más reciente.
export async function listarSolicitudesNombre(): Promise<SolicitudNombreAdmin[]> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE_URL}/api/admin/solicitudes-nombre`, {
      credentials: 'include',
    })
  } catch {
    throw new ErrorAdmin(MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorAdmin(
      await leerMensajeError(respuesta, 'No pudimos cargar las solicitudes de cambio de nombre.'),
    )
  }

  const { solicitudes } = (await respuesta.json()) as { solicitudes: SolicitudNombreAdmin[] }
  return solicitudes
}

async function resolverSolicitudNombre(
  idSolicitud: string,
  accion: 'aprobar' | 'rechazar',
  cuerpo: object | undefined,
  mensajePorDefecto: string,
): Promise<void> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE_URL}/api/admin/solicitudes-nombre/${idSolicitud}/${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(cuerpo ?? {}),
    })
  } catch {
    throw new ErrorAdmin(MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) throw new ErrorAdmin(await leerMensajeError(respuesta, mensajePorDefecto))
}

// POST /api/admin/solicitudes-nombre/{id}/aprobar: aplica el nombre solicitado.
export function aprobarSolicitudNombre(idSolicitud: string): Promise<void> {
  return resolverSolicitudNombre(
    idSolicitud,
    'aprobar',
    undefined,
    'No pudimos aprobar la solicitud. Intenta de nuevo.',
  )
}

// POST /api/admin/solicitudes-nombre/{id}/rechazar: el motivo es opcional y la
// persona lo ve en su perfil.
export function rechazarSolicitudNombre(idSolicitud: string, motivo: string): Promise<void> {
  return resolverSolicitudNombre(
    idSolicitud,
    'rechazar',
    { motivo },
    'No pudimos rechazar la solicitud. Intenta de nuevo.',
  )
}
