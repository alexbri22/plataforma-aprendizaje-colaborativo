import type { ErrorRequestHandler } from 'express'
import { ErrorDominio } from '../errores.js'

// Forma del error de docs/diseno-desarrollo-nucleo.md §3.1: un objeto único
// con código estable, mensaje en español y, si aplica, detalle por campo.
// Los cuatro parámetros son obligatorios: Express solo reconoce un
// middleware como manejador de errores por su aridad.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const manejadorErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErrorDominio) {
    res.status(err.status).json({
      codigo: err.codigo,
      mensaje: err.message,
      ...(err.detallePorCampo ? { detallePorCampo: err.detallePorCampo } : {}),
    })
    return
  }

  console.error(err)
  res.status(500).json({ codigo: 'error_interno', mensaje: 'Ocurrió un error inesperado.' })
}
