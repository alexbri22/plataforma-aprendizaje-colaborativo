import type { Request } from 'express'
import rateLimit, {
  ipKeyGenerator,
  type RateLimitInfo,
  type RateLimitRequestHandler,
} from 'express-rate-limit'
import { config } from '../config.js'

// express-rate-limit deja aquí el estado del contador de la petición; la
// ruta de sesión lo lee para decir cuántos intentos quedan.
declare module 'express-serve-static-core' {
  interface Request {
    rateLimit?: RateLimitInfo
  }
}

interface OpcionesLimitador {
  keyGenerator?: (req: Request) => string
  // Solo cuentan los intentos fallidos (respuesta 4xx/5xx): un ingreso o un
  // registro correcto no gasta cupo.
  soloFallidos?: boolean
}

// Segundos hasta que la ventana del contador se reinicia. El cliente lo usa
// para decir cuánto esperar en vez de "más tarde" (el encabezado Retry-After
// dice lo mismo, pero CORS no lo expone).
export function segundosParaReintentar(req: Request): number {
  const reinicio = req.rateLimit?.resetTime
  if (!reinicio) return 60
  return Math.max(1, Math.ceil((reinicio.getTime() - Date.now()) / 1000))
}

// Límite de intentos en registro e inicio de sesión (docs/diseno-desarrollo-nucleo.md
// §3.2 y §3.3).
export function crearLimitador(
  ventanaMin: number,
  max: number,
  { keyGenerator, soloFallidos = false }: OpcionesLimitador = {},
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: ventanaMin * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: soloFallidos,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res) => {
      res.status(429).json({
        codigo: 'limite_intentos',
        mensaje: 'Demasiados intentos. Intenta de nuevo más tarde.',
        reintentarEnSegundos: segundosParaReintentar(req),
      })
    },
  })
}

// Un salón entero suele salir a internet por la misma IP: contar por IP sola
// bloqueaba a todo el grupo en cuanto se sumaban unos cuantos intentos de
// personas distintas. Por eso los éxitos no cuentan, y el inicio de sesión
// lleva su conteo por IP y correo: los errores de una persona no le quitan
// cupo a la de al lado. El correo se cuenta exista o no la cuenta, así que
// el límite no revela cuáles están registradas.
function claveIpYCorreo(req: Request): string {
  const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : ''
  return `${ipKeyGenerator(req.ip ?? '')}|${correo}`
}

export const limitadorRegistro = crearLimitador(
  config.limiteIntentos.registro.ventanaMin,
  config.limiteIntentos.registro.max,
  { soloFallidos: true },
)

export const limitadorSesion = crearLimitador(
  config.limiteIntentos.sesion.ventanaMin,
  config.limiteIntentos.sesion.max,
  { keyGenerator: claveIpYCorreo, soloFallidos: true },
)

// Respaldo del anterior: contar por correo deja que una misma IP pruebe
// muchos correos distintos, así que también hay un tope de fallos por IP,
// holgado para que un salón no lo alcance por errores de dedo.
export const limitadorSesionPorIp = crearLimitador(
  config.limiteIntentos.sesionPorIp.ventanaMin,
  config.limiteIntentos.sesionPorIp.max,
  { soloFallidos: true },
)

// A diferencia de registro/inicio de sesión, esta ruta va detrás de
// `exigirSesion` (docs/diseno-desarrollo-nucleo.md §3.3): quien llama ya
// tiene sesión, así que el límite se lleva por sesión y no por IP — rotar de
// IP no le da a quien adivina una clave un cupo nuevo de intentos.
export const limitadorClave = crearLimitador(
  config.limiteIntentos.clave.ventanaMin,
  config.limiteIntentos.clave.max,
  { keyGenerator: (req) => req.idSesion as string },
)
