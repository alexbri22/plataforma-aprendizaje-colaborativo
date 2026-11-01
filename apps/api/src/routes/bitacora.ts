import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  crearEntradaBitacora,
  editarEntradaBitacora,
  listarBitacora,
} from '../services/seguimiento/bitacora.service.js'
import { validarDatosEntradaBitacora } from '../services/seguimiento/validacion.js'

export const bitacoraRouter = Router()

function idMembresiaDeQuery(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : undefined
}

// GET /api/actividades/{id}/bitacora (nucleo §9.4): sin ?idMembresia, las
// entradas propias; con ella, las de otro participante, solo para quien
// organiza o co-organiza con `leer_bitacoras` (P-06).
bitacoraRouter.get(
  '/actividades/:id/bitacora',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const entradas = await listarBitacora(
      actividad,
      membresia,
      idMembresiaDeQuery(req.query.idMembresia),
    )
    res.status(200).json({ entradas })
  },
)

// POST /api/actividades/{id}/bitacora: crea una entrada propia.
bitacoraRouter.post(
  '/actividades/:id/bitacora',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const { contenido } = validarDatosEntradaBitacora(req.body)

    const entrada = await crearEntradaBitacora(actividad, contenido, actor.idUsuario, membresia)
    res.status(201).location(`/api/bitacora/${entrada.id}`).json({ entrada })
  },
)

// PATCH /api/bitacora/{id}: el autor edita una entrada propia. No cuelga de
// /actividades/{id}, igual que PATCH /api/elementos/{id}: el servicio
// resuelve la actividad por su cuenta.
bitacoraRouter.patch('/bitacora/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { contenido } = validarDatosEntradaBitacora(req.body)
  const entrada = await editarEntradaBitacora(req.params.id as string, contenido, actor.idUsuario)
  res.status(200).json({ entrada })
})
