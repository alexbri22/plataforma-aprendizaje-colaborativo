import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import { config } from './config.js'
import { manejadorErrores } from './middleware/manejadorErrores.js'
import { resolverSesion } from './middleware/sesion.js'
import { cuentasRouter } from './routes/cuentas.js'
import { healthRouter } from './routes/health.js'

export function createApp(): Express {
  const app = express()

  // El despliegue real siempre llega detrás de un proxy inverso. Sin esto,
  // req.ip resuelve a la IP interna del proxy para todas las peticiones,
  // así que limitadorRegistro/limitadorSesion compartirían un único
  // contador entre todos los visitantes en vez de uno por IP real.
  app.set('trust proxy', true)

  // Origen fijo al cliente web y credenciales habilitadas, para que la
  // cookie de sesión viaje entre orígenes distintos en desarrollo
  // (docs/diseno-desarrollo-nucleo.md §3.2).
  app.use(cors({ origin: config.webOrigin, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use(resolverSesion)

  app.use('/health', healthRouter)
  app.use('/api', cuentasRouter)

  app.use(manejadorErrores)

  return app
}
