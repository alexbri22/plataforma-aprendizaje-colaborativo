import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  crearComentarioSobreElemento,
  crearComentarioSobreEntrada,
  crearRetroalimentacionDeEquipo,
  editarComentario,
  listarComentariosDeElemento,
  listarComentariosDeEntrada,
  listarRetroalimentacionDeActividad,
} from '../services/seguimiento/comentarios.service.js'
import {
  validarDatosComentario,
  validarDatosRetroalimentacion,
} from '../services/seguimiento/validacion.js'

export const comentariosRouter = Router()

// GET/POST /api/elementos/{id}/comentarios (nucleo §9.4, §10.4): sobre una
// meta, un avance o un recurso. Visibilidad heredada del elemento.
comentariosRouter.get('/elementos/:id/comentarios', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const comentarios = await listarComentariosDeElemento(req.params.id as string, actor.idUsuario)
  res.status(200).json({ comentarios })
})

comentariosRouter.post('/elementos/:id/comentarios', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { contenido } = validarDatosComentario(req.body)
  const comentario = await crearComentarioSobreElemento(
    req.params.id as string,
    contenido,
    actor.idUsuario,
  )
  res.status(201).location(`/api/comentarios/${comentario.id}`).json({ comentario })
})

// GET/POST /api/bitacora/{id}/comentarios: sobre una entrada de bitácora.
// Visibilidad heredada de la entrada (P-06).
comentariosRouter.get('/bitacora/:id/comentarios', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const comentarios = await listarComentariosDeEntrada(req.params.id as string, actor.idUsuario)
  res.status(200).json({ comentarios })
})

comentariosRouter.post('/bitacora/:id/comentarios', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { contenido } = validarDatosComentario(req.body)
  const comentario = await crearComentarioSobreEntrada(
    req.params.id as string,
    contenido,
    actor.idUsuario,
  )
  res.status(201).location(`/api/comentarios/${comentario.id}`).json({ comentario })
})

// PATCH /api/comentarios/{id}: el autor edita el comentario.
comentariosRouter.patch('/comentarios/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { contenido } = validarDatosComentario(req.body)
  const comentario = await editarComentario(req.params.id as string, contenido, actor.idUsuario)
  res.status(200).json({ comentario })
})

// GET /api/actividades/{id}/retroalimentacion: la retroalimentación a los
// equipos (todos para quien organiza; el propio y su bitácora para quien
// participa).
comentariosRouter.get(
  '/actividades/:id/retroalimentacion',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const resultado = await listarRetroalimentacionDeActividad(req.params.id as string, membresia)
    res.status(200).json(resultado)
  },
)

// POST /api/equipos/{id}/retroalimentacion: sobre una sección del equipo o
// sobre el equipo en general.
comentariosRouter.post('/equipos/:id/retroalimentacion', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { seccion, contenido } = validarDatosRetroalimentacion(req.body)
  const comentario = await crearRetroalimentacionDeEquipo(
    req.params.id as string,
    seccion,
    contenido,
    actor.idUsuario,
  )
  res.status(201).location(`/api/comentarios/${comentario.id}`).json({ comentario })
})
