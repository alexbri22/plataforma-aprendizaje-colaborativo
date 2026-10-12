import type { ElementoEspacioEquipo } from '@plataforma/shared'
import { ELEMENTOS_ESPACIO_EQUIPO } from '@plataforma/shared'
import { Router } from 'express'
import { exigirSesion } from '../middleware/sesion.js'
import {
  crearElemento,
  editarElemento,
  eliminarElemento,
  listarElementos,
} from '../services/seguimiento/elementos.service.js'
import {
  validarDatosActualizarElemento,
  validarDatosCrearElemento,
} from '../services/seguimiento/validacion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'

export const elementosRouter = Router()

function tipoDeQuery(valor: unknown): ElementoEspacioEquipo | undefined {
  return typeof valor === 'string' &&
    (ELEMENTOS_ESPACIO_EQUIPO as readonly string[]).includes(valor)
    ? (valor as ElementoEspacioEquipo)
    : undefined
}

// GET /api/equipos/{id}/elementos (nucleo §9.4): el espacio del equipo,
// filtrable por tipo. Igual que /equipos/{id}, no cuelga de
// cargarContextoActividad: el servicio resuelve equipo, actividad y
// membresía por su cuenta.
elementosRouter.get('/equipos/:id/elementos', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const elementos = await listarElementos(
    req.params.id as string,
    actor.idUsuario,
    tipoDeQuery(req.query.tipo),
  )
  res.status(200).json({ elementos })
})

// POST /api/equipos/{id}/elementos: crea una meta, un avance o un recurso.
elementosRouter.post('/equipos/:id/elementos', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { tipo, contenido } = validarDatosCrearElemento(req.body)
  const elemento = await crearElemento(req.params.id as string, tipo, contenido, actor.idUsuario)
  res.status(201).location(`/api/elementos/${elemento.id}`).json({ elemento })
})

// PATCH /api/elementos/{id}: edita el contenido.
elementosRouter.patch('/elementos/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { contenido } = validarDatosActualizarElemento(req.body)
  const elemento = await editarElemento(req.params.id as string, contenido, actor.idUsuario)
  res.status(200).json({ elemento })
})

// DELETE /api/elementos/{id}: el evento conserva el contenido eliminado.
elementosRouter.delete('/elementos/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  await eliminarElemento(req.params.id as string, actor.idUsuario)
  res.status(204).end()
})
