import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import { obtenerActividadPorId } from '../services/actividades/actividades.service.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  asignarIntegrante,
  cerrarFormacion,
  crearEquipo,
  editarEquipo,
  eliminarEquipo,
  generarPropuesta,
  listarEquipos,
  retirarIntegrante,
} from '../services/equipos/equipos.service.js'
import {
  validarDatosActualizarEquipo,
  validarDatosCrearEquipo,
  validarDatosGenerarPropuesta,
} from '../services/equipos/validacion.js'

export const equiposRouter = Router()

// GET /api/actividades/{id}/equipos (docs/diseno-desarrollo-nucleo.md §8.6):
// cualquier miembro ve los equipos con sus integrantes y quiénes quedan sin
// equipo (P-04). 404 si el actor no es miembro, resuelto por
// cargarContextoActividad.
equiposRouter.get(
  '/actividades/:id/equipos',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const lista = await listarEquipos(req.params.id as string, membresia.idMembresia)
    res.status(200).json(lista)
  },
)

// POST /api/actividades/{id}/equipos: crea un equipo (quien gestiona equipos,
// o cualquier miembro con la formación autogestionada, que además queda en él).
equiposRouter.post(
  '/actividades/:id/equipos',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const { nombre } = validarDatosCrearEquipo(req.body)

    const equipo = await crearEquipo(req.params.id as string, nombre, actor.idUsuario, membresia)
    res.status(201).location(`/api/equipos/${equipo.id}`).json({ equipo })
  },
)

// POST /api/actividades/{id}/equipos/propuesta (nucleo §8.6, con la decisión de
// producto de materializarla): genera la propuesta del sistema como equipos
// normales en formación.
equiposRouter.post(
  '/actividades/:id/equipos/propuesta',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const { semilla } = validarDatosGenerarPropuesta(req.body)

    const propuesta = await generarPropuesta(
      req.params.id as string,
      semilla,
      actor.idUsuario,
      membresia,
    )
    res.status(201).json(propuesta)
  },
)

// POST /api/actividades/{id}/formacion/cierre (nucleo §7.4 y §7.7): cierra la
// formación, con reparto automático de quienes quedaron sin equipo.
equiposRouter.post(
  '/actividades/:id/formacion/cierre',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const idActividad = req.params.id as string

    await cerrarFormacion(idActividad, actor.idUsuario, membresia)
    const actividad = await obtenerActividadPorId(idActividad, membresia)
    res.status(200).json({ actividad })
  },
)

// PATCH /api/equipos/{id}: nombre, descripción y forma de trabajo.
equiposRouter.patch('/equipos/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const cambios = validarDatosActualizarEquipo(req.body)
  const equipo = await editarEquipo(req.params.id as string, cambios, actor.idUsuario)
  res.status(200).json({ equipo })
})

// DELETE /api/equipos/{id}: solo un equipo vacío, en formación.
equiposRouter.delete('/equipos/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  await eliminarEquipo(req.params.id as string, actor.idUsuario)
  res.status(204).end()
})

// PUT /api/equipos/{id}/integrantes/{idMembresia}: asigna o mueve.
equiposRouter.put('/equipos/:id/integrantes/:idMembresia', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const equipo = await asignarIntegrante(
    req.params.id as string,
    req.params.idMembresia as string,
    actor.idUsuario,
  )
  res.status(200).json({ equipo })
})

// DELETE /api/equipos/{id}/integrantes/{idMembresia}: saca del equipo a quien
// organiza o co-organiza. Un participante solo se mueve.
equiposRouter.delete('/equipos/:id/integrantes/:idMembresia', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const equipo = await retirarIntegrante(
    req.params.id as string,
    req.params.idMembresia as string,
    actor.idUsuario,
  )
  res.status(200).json({ equipo })
})
