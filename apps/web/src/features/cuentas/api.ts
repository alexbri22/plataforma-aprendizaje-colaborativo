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

async function enviar(ruta: string, datos: unknown): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // La sesión viaja como cookie httpOnly (docs/diseno-desarrollo-nucleo.md
      // §3.2), no como token en el cuerpo de la respuesta — sin esto el
      // navegador no la envía ni la acepta entre orígenes distintos en dev.
      credentials: 'include',
      body: JSON.stringify(datos),
    })
  } catch {
    throw new ErrorCuenta(MENSAJE_SIN_CONEXION)
  }
}

export async function iniciarSesion(credenciales: CredencialesIngreso): Promise<void> {
  const respuesta = await enviar('/api/sesion', credenciales)

  if (respuesta.status === 401) {
    throw new ErrorCuenta('Correo o contraseña incorrectos.')
  }
  if (!respuesta.ok) {
    throw new ErrorCuenta(
      await leerMensajeError(respuesta, 'No pudimos iniciar tu sesión. Intenta de nuevo.'),
    )
  }
}

export async function registrarUsuario(datos: DatosRegistro): Promise<void> {
  const respuesta = await enviar('/api/usuarios', datos)

  if (respuesta.status === 409) {
    throw new ErrorCuenta('Ya existe una cuenta con este correo.')
  }
  if (!respuesta.ok) {
    throw new ErrorCuenta(
      await leerMensajeError(respuesta, 'No pudimos crear tu cuenta. Intenta de nuevo.'),
    )
  }
}
