import { Router } from 'express'
import { ErrorValidacion } from '../errores.js'
import { limitadorConstancia } from '../middleware/limitadorTasa.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  cambiarVisibilidadConstancias,
  constanciasVisiblesDe,
  listarMisConstancias,
  verificarConstancia,
} from '../services/formacion/constancias.service.js'

// Constancias de finalización (docs/diseno-desarrollo-formacion.md, nota del
// incremento 5). Las emite el progreso; aquí solo se leen y se decide si se
// muestran en el perfil. La verificación por folio es pública.
export const constanciasRouter = Router()

function idDe(req: { actor?: UsuarioPublico }): string {
  return (req.actor as UsuarioPublico).idUsuario
}

// GET /api/me/constancias: las mías, la más reciente primero, y si las
// muestro en mi perfil.
constanciasRouter.get('/me/constancias', exigirSesion, async (req, res) => {
  res.status(200).json(await listarMisConstancias(idDe(req)))
})

// PUT /api/me/constancias/visibilidad { publicas }: mostrarlas u ocultarlas
// en mi perfil. Ocultas por defecto.
constanciasRouter.put('/me/constancias/visibilidad', exigirSesion, async (req, res) => {
  const publicas = (req.body as Record<string, unknown> | undefined)?.publicas
  if (typeof publicas !== 'boolean') {
    throw new ErrorValidacion({ publicas: 'Indica si quieres mostrar tus constancias.' })
  }
  res.status(200).json({ publicas: await cambiarVisibilidadConstancias(idDe(req), publicas) })
})

// GET /api/usuarios/:id/constancias: las que el perfil de esa persona muestra.
// Con sesión, como el perfil; vacía si no las hizo públicas. Vive en el router
// de Formación aunque cuelgue de /usuarios: Formación es dueña de los datos y
// de la regla, y el perfil solo pinta lo que recibe.
constanciasRouter.get('/usuarios/:id/constancias', exigirSesion, async (req, res) => {
  res.status(200).json({ constancias: await constanciasVisiblesDe(req.params.id as string) })
})

// GET /api/constancias/:folio: verificación pública, sin sesión y con límite
// de intentos. No se indexa: la persona decide con quién compartir el enlace.
constanciasRouter.get('/constancias/:folio', limitadorConstancia, async (req, res) => {
  const constancia = await verificarConstancia(req.params.folio as string)
  res.setHeader('X-Robots-Tag', 'noindex')
  res.status(200).json({ constancia })
})
