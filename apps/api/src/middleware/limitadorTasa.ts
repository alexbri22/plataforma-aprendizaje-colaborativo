import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'
import { config } from '../config.js'

// Límite de intentos en registro e inicio de sesión (docs/diseno-desarrollo-nucleo.md
// §3.2 y §3.3).
export function crearLimitador(ventanaMin: number, max: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs: ventanaMin * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
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
