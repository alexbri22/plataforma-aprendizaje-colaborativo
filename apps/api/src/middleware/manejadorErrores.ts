import type { ErrorRequestHandler } from 'express'
import { ErrorDominio } from '../errores.js'

// Errores que el analizador de cuerpo (body-parser) lanza como http-errors:
// traen estado 4xx y `expose`, que es su forma de decir que el mensaje es
// para el cliente.
function esErrorDeCliente(err: unknown): err is { status: number; type?: string } {
  if (!err || typeof err !== 'object') return false
  const { status, expose } = err as { status?: unknown; expose?: unknown }
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true
}

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

  // Errores del analizador de cuerpo (JSON malformado, cuerpo mayor que el
  // límite): traen su propio estado y son culpa del cliente, no del servidor.
  if (esErrorDeCliente(err)) {
    res.status(err.status).json({
      codigo: 'peticion_invalida',
      mensaje:
        err.type === 'entity.too.large'
          ? 'El contenido enviado es demasiado grande.'
          : 'No pudimos leer el contenido de la petición.',
    })
    return
  }

  console.error(err)
  res.status(500).json({ codigo: 'error_interno', mensaje: 'Ocurrió un error inesperado.' })
}
