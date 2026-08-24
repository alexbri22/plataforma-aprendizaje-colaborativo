import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import { config } from './config.js'
import { manejadorErrores } from './middleware/manejadorErrores.js'
import { resolverSesion } from './middleware/sesion.js'
import { cuentasRouter } from './routes/cuentas.js'
import { healthRouter } from './routes/health.js'

// Cada preview de Vercel vive en un subdominio *.vercel.app distinto e
// impredecible (uno por rama/PR) — no se puede precargar en WEB_ORIGIN.
// Ampliar el permiso a ese patrón es seguro: la cookie de sesión usa
// SameSite=Lax (sesiones.ts), que ya impide que un origen ajeno la reciba
// en una petición cruzada, sin importar lo que decida CORS.
const ORIGEN_VERCEL = /^https:\/\/[a-z0-9-]+\.vercel\.app$/

export function createApp(): Express {
  const app = express()

  // Lista de orígenes permitidos y credenciales habilitadas, para que la
  // cookie de sesión viaje entre orígenes distintos en desarrollo
  // (docs/diseno-desarrollo-nucleo.md §3.2). Sin origen (curl, health
  // checks) se deja pasar. El navegador manda Origin incluso en peticiones
  // same-origin cuando el método no es GET, así que aunque el despliegue
  // en Vercel sirve todo desde el mismo dominio, esta lista igual se
  // evalúa en cada POST/DELETE.
  app.use(
    cors({
      origin(origen, callback) {
        if (!origen || config.webOrigins.includes(origen) || ORIGEN_VERCEL.test(origen)) {
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
  // También bajo /api: en Vercel la función solo está mapeada a ese
  // prefijo (ver api/[...path].ts en la raíz del repo), así que /health a
  // secas no es alcanzable ahí.
  app.use('/api/health', healthRouter)
  app.use('/api', cuentasRouter)

  app.use(manejadorErrores)

  return app
}
