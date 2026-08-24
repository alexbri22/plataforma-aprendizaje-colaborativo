const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export interface CredencialesIngreso {
  correo: string
  contrasena: string
}

export interface DatosRegistro {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  nivelEstudios: string
  institucionEducativa: string
  correo: string
  contrasena: string
}

export interface Usuario {
  idUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  correo: string
  tipoCuenta: 'usuario' | 'administrador'
}

export class ErrorCuenta extends Error {}

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
      // §3.2), no como token en el cuerpo de la respuesta — sin esto el
      // navegador no la envía ni la acepta entre orígenes distintos en dev.
      credentials: 'include',
      ...opciones,
    })
  } catch {
    throw new ErrorCuenta(MENSAJE_SIN_CONEXION)
  }
}

function enviar(ruta: string, datos: unknown): Promise<Response> {
  return pedir(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
}

export async function iniciarSesion(credenciales: CredencialesIngreso): Promise<Usuario> {
  const respuesta = await enviar('/api/sesion', credenciales)

  if (respuesta.status === 401) {
    throw new ErrorCuenta('Correo o contraseña incorrectos.')
  }
  if (!respuesta.ok) {
    throw new ErrorCuenta(
      await leerMensajeError(respuesta, 'No pudimos iniciar tu sesión. Intenta de nuevo.'),
    )
  }

  const { usuario } = (await respuesta.json()) as { usuario: Usuario }
  return usuario
}

export async function registrarUsuario(datos: DatosRegistro): Promise<Usuario> {
  const respuesta = await enviar('/api/usuarios', datos)

  if (respuesta.status === 409) {
    throw new ErrorCuenta('Ya existe una cuenta con este correo.')
  }
  if (!respuesta.ok) {
    throw new ErrorCuenta(
      await leerMensajeError(respuesta, 'No pudimos crear tu cuenta. Intenta de nuevo.'),
    )
  }

  const { usuario } = (await respuesta.json()) as { usuario: Usuario }
  return usuario
}

// Sin cookie de sesión válida, GET /api/sesion responde 401: no es un error
// de la petición, es la forma en que el servidor dice "nadie ha iniciado
// sesión". Se traduce a `null` en vez de lanzar, para que quien llama no
// tenga que distinguir "sin sesión" de una falla real de red.
export async function obtenerSesionActual(): Promise<Usuario | null> {
  const respuesta = await pedir('/api/sesion')

  if (respuesta.status === 401) return null
  if (!respuesta.ok) {
    throw new ErrorCuenta(await leerMensajeError(respuesta, 'No pudimos verificar tu sesión.'))
  }

  const { usuario } = (await respuesta.json()) as { usuario: Usuario }
  return usuario
}

export async function cerrarSesion(): Promise<void> {
  const respuesta = await pedir('/api/sesion', { method: 'DELETE' })

  // 401 aquí significa que ya no había sesión que cerrar: el resultado que
  // quería quien llama (nadie con sesión iniciada) ya se cumplió.
  if (!respuesta.ok && respuesta.status !== 401) {
    throw new ErrorCuenta(await leerMensajeError(respuesta, 'No pudimos cerrar tu sesión.'))
  }
}
