import { Router } from 'express'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  crearActividad,
  listarActividadesDeUsuario,
} from '../services/actividades/actividades.service.js'
import { validarDatosCrearActividad } from '../services/actividades/validacion.js'

export const actividadesRouter = Router()

// POST /api/actividades (docs/diseno-desarrollo-nucleo.md §7.7): crea la
// actividad y la membresía de organizador del actor.
actividadesRouter.post('/actividades', exigirSesion, async (req, res) => {
  const datos = validarDatosCrearActividad(req.body)
  const actor = req.actor as UsuarioPublico
  const actividad = await crearActividad(actor.idUsuario, datos)
  res.status(201).json({ actividad })
})

// GET /api/actividades: actividades donde el actor tiene membresía, con su
// rol en cada una.
actividadesRouter.get('/actividades', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const actividades = await listarActividadesDeUsuario(actor.idUsuario)
  res.status(200).json({ actividades })
})
