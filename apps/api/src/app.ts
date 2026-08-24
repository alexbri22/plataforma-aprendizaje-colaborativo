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

  // Lista de orígenes permitidos y credenciales habilitadas, para que la
  // cookie de sesión viaje entre orígenes distintos en desarrollo
  // (docs/diseno-desarrollo-nucleo.md §3.2). Sin origen (curl, health
  // checks) se deja pasar; con origen, debe estar en la lista.
  app.use(
    cors({
      origin(origen, callback) {
        if (!origen || config.webOrigins.includes(origen)) {
          callback(null, true)
          return
        }
        callback(new Error('Origen no permitido por CORS'))
      },
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(cookieParser())
  app.use(resolverSesion)

  app.use('/health', healthRouter)
  app.use('/api', cuentasRouter)

  app.use(manejadorErrores)

  return app
}
