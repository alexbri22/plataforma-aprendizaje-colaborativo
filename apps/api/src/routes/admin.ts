import { Router } from 'express'
import { exigirAdministrador } from '../middleware/sesion.js'
import { listarUsuarios, restablecerContrasena } from '../services/cuentas/admin.service.js'
import {
  aprobarSolicitud,
  listarSolicitudesPendientes,
  rechazarSolicitud,
} from '../services/cuentas/solicitudesNombre.service.js'
import { validarNuevaContrasena, validarRechazoSolicitud } from '../services/cuentas/validacion.js'

// Panel de administración (docs/diseno-desarrollo-nucleo.md §6.5). Solo las
// dos operaciones en alcance: listar cuentas y restablecer contraseña. La
// activación/desactivación (PATCH /api/admin/usuarios/{id}) queda documentada
// pero fuera de este incremento.
export const adminRouter = Router()

// GET /api/admin/usuarios: lista de cuentas con su estado.
adminRouter.get('/usuarios', exigirAdministrador, async (_req, res) => {
  const usuarios = await listarUsuarios()
  res.status(200).json({ usuarios })
})

// POST /api/admin/usuarios/:id/contrasena: restablece la contraseña y cierra
// las sesiones del usuario afectado.
adminRouter.post('/usuarios/:id/contrasena', exigirAdministrador, async (req, res) => {
  const { contrasena } = validarNuevaContrasena(req.body)
  await restablecerContrasena(req.params.id as string, contrasena)
  res.status(204).end()
})

// Solicitudes de cambio de nombre (docs/diseno-desarrollo-nucleo.md §6.3).
// GET: las pendientes, de la más antigua a la más reciente.
adminRouter.get('/solicitudes-nombre', exigirAdministrador, async (_req, res) => {
  const solicitudes = await listarSolicitudesPendientes()
  res.status(200).json({ solicitudes })
})

// POST .../aprobar: aplica el nombre solicitado. 404 si ya no está pendiente.
adminRouter.post('/solicitudes-nombre/:id/aprobar', exigirAdministrador, async (req, res) => {
  await aprobarSolicitud(req.params.id as string)
  res.status(204).end()
})

// POST .../rechazar: la rechaza con un motivo opcional que la persona ve.
adminRouter.post('/solicitudes-nombre/:id/rechazar', exigirAdministrador, async (req, res) => {
  const { motivo } = validarRechazoSolicitud(req.body)
  await rechazarSolicitud(req.params.id as string, motivo)
  res.status(204).end()
})
