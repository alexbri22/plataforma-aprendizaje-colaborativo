import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.js'
import { ErrorNoAutorizado, ErrorSinSesion } from '../errores.js'
import { obtenerActorPorSesion, type UsuarioPublico } from '../services/cuentas/cuentas.service.js'

declare module 'express-serve-static-core' {
  interface Request {
    actor?: UsuarioPublico
    idSesion?: string
  }
}

// Resuelve la cookie a un usuario (docs/diseno-desarrollo-nucleo.md §2.1,
// paso "Sesión"). No rechaza nada por sí sola: deja el contexto en la
// petición y exigirSesion es quien exige que exista para las rutas que lo
// requieren.
export async function resolverSesion(req: Request, _res: Response, next: NextFunction) {
  const idSesion = req.cookies?.[config.sesion.nombreCookie] as string | undefined
  if (!idSesion) {
    next()
    return
  }

  req.idSesion = idSesion
  try {
    req.actor = await obtenerActorPorSesion(idSesion)
  } catch (error) {
    if (!(error instanceof ErrorSinSesion)) {
      next(error)
      return
    }
  }
  next()
}

export function exigirSesion(req: Request, _res: Response, next: NextFunction) {
  if (!req.actor) {
    next(new ErrorSinSesion())
    return
  }
  next()
}

// Exige que el actor sea del tipo de cuenta administrador (plano de cuenta,
// docs/diseno-desarrollo-general.md §7.2). Encadena las dos verificaciones de
// §7.1: primero que haya sesión, después el tipo de cuenta. Es la barrera de
// autorización real del panel de administración; el cliente solo oculta
// acciones (docs/diseno-desarrollo-general.md §3.5).
export function exigirAdministrador(req: Request, _res: Response, next: NextFunction) {
  if (!req.actor) {
    next(new ErrorSinSesion())
    return
  }
  if (req.actor.tipoCuenta !== 'administrador') {
    next(new ErrorNoAutorizado())
    return
  }
  next()
}
