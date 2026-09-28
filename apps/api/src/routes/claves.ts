import { Router } from 'express'
import { limitadorClave } from '../middleware/limitadorTasa.js'
import { exigirSesion } from '../middleware/sesion.js'
import {
  buscarActividadPorClave,
  unirseConClave,
} from '../services/actividades/actividades.service.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'

// No cuelgan de /actividades (docs/diseno-desarrollo-nucleo.md §7.7): quien
// llama todavía no es miembro y no debe poder direccionar la actividad por
// su identificador (§3.3).
export const clavesRouter = Router()

// GET /api/claves/{clave}: vista previa mínima para decidir si unirse.
// Limitada por intentos en ambas rutas (§3.2/§3.3): la de unión también
// permite deducir si una clave es válida por su resultado.
clavesRouter.get('/claves/:clave', exigirSesion, limitadorClave, async (req, res) => {
  const vistaPrevia = await buscarActividadPorClave(req.params.clave as string)
  res.status(200).json(vistaPrevia)
})

// POST /api/claves/{clave}/union: se une como participante.
clavesRouter.post('/claves/:clave/union', exigirSesion, limitadorClave, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const actividad = await unirseConClave(req.params.clave as string, actor.idUsuario)
  res.status(201).json({ actividad })
})
