import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  actualizarPeriodo,
  definirPeriodos,
  listarPeriodos,
} from '../services/seguimiento/periodos.service.js'
import {
  validarDatosActualizarPeriodo,
  validarDatosDefinirPeriodos,
} from '../services/seguimiento/validacion.js'

export const periodosRouter = Router()

// GET /api/actividades/{id}/periodos (docs/diseno-desarrollo-nucleo.md §9.4):
// cualquier miembro. 404 si el actor no es miembro, resuelto por
// cargarContextoActividad.
periodosRouter.get(
  '/actividades/:id/periodos',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const periodos = await listarPeriodos(req.params.id as string)
    res.status(200).json({ periodos })
  },
)

// PUT /api/actividades/{id}/periodos: genera el calendario a partir de una
// periodicidad, o lo borra con 'ninguna'.
periodosRouter.put(
  '/actividades/:id/periodos',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const { periodicidad } = validarDatosDefinirPeriodos(req.body)

    const periodos = await definirPeriodos(actividad, periodicidad, actor.idUsuario, membresia)
    res.status(200).json({ periodos })
  },
)

// PATCH /api/actividades/{id}/periodos/{idPeriodo}: ajusta las fechas de un
// periodo o lo cancela/reactiva. No está en la tabla de nucleo §9.4, que solo
// lista el PUT; es el ajuste individual que describe P-28.
periodosRouter.patch(
  '/actividades/:id/periodos/:idPeriodo',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const cambios = validarDatosActualizarPeriodo(req.body)

    const periodo = await actualizarPeriodo(
      actividad,
      req.params.idPeriodo as string,
      cambios,
      actor.idUsuario,
      membresia,
    )
    res.status(200).json({ periodo })
  },
)
