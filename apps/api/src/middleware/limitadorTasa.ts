import type { Request } from 'express'
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'
import { config } from '../config.js'

// Límite de intentos en registro e inicio de sesión (docs/diseno-desarrollo-nucleo.md
// §3.2 y §3.3).
export function crearLimitador(
  ventanaMin: number,
  max: number,
  keyGenerator?: (req: Request) => string,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: ventanaMin * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_req, res) => {
      res.status(429).json({
        codigo: 'limite_intentos',
        mensaje: 'Demasiados intentos. Intenta de nuevo más tarde.',
      })
    },
  })
}

export const limitadorRegistro = crearLimitador(
  config.limiteIntentos.registro.ventanaMin,
  config.limiteIntentos.registro.max,
)

export const limitadorSesion = crearLimitador(
  config.limiteIntentos.sesion.ventanaMin,
  config.limiteIntentos.sesion.max,
)

// A diferencia de registro/inicio de sesión, esta ruta va detrás de
// `exigirSesion` (docs/diseno-desarrollo-nucleo.md §3.3): quien llama ya
// tiene sesión, así que el límite se lleva por sesión y no por IP — rotar de
// IP no le da a quien adivina una clave un cupo nuevo de intentos.
export const limitadorClave = crearLimitador(
  config.limiteIntentos.clave.ventanaMin,
  config.limiteIntentos.clave.max,
  (req) => req.idSesion as string,
)
