import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  agregarOPromoverCoorganizador,
  cerrarInscripcion,
  configurarFuncion,
  crearActividad,
  listarActividadesDeUsuario,
  listarParticipantes,
  obtenerActividadPorId,
} from '../services/actividades/actividades.service.js'
import {
  validarDatosAgregarCoorganizador,
  validarDatosConfigurarFuncion,
  validarDatosCrearActividad,
  validarFuncion,
} from '../services/actividades/validacion.js'

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

// GET /api/actividades/{id} (docs/diseno-desarrollo-nucleo.md §7.7):
// actividad, configuración y capacidades del actor. 404 si el actor no es
// miembro (§3.3), resuelto por cargarContextoActividad.
actividadesRouter.get(
  '/actividades/:id',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const actividad = await obtenerActividadPorId(req.params.id as string, membresia)
    res.status(200).json({ actividad })
  },
)

// GET /api/actividades/{id}/participantes (docs/diseno-desarrollo-nucleo.md
// §7.7): cualquier miembro puede consultarla, no solo quien organiza.
actividadesRouter.get(
  '/actividades/:id/participantes',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const participantes = await listarParticipantes(req.params.id as string)
    res.status(200).json({ participantes })
  },
)

// PUT /api/actividades/{id}/configuracion/{funcion}: fija el estado de una
// función de seguimiento.
actividadesRouter.put(
  '/actividades/:id/configuracion/:funcion',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const funcion = validarFuncion(req.params.funcion)
    const estadoNuevo = validarDatosConfigurarFuncion(funcion, req.body)

    const actividad = await configurarFuncion(
      req.params.id as string,
      funcion,
      estadoNuevo,
      actor.idUsuario,
      membresia,
    )
    res.status(200).json({ actividad })
  },
)

// POST /api/actividades/{id}/inscripcion/cierre (docs/diseno-desarrollo-nucleo.md
// §7.4 y §7.7): cierra la inscripción y pasa a formación de equipos.
actividadesRouter.post(
  '/actividades/:id/inscripcion/cierre',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const actividad = await cerrarInscripcion(req.params.id as string, actor.idUsuario, membresia)
    res.status(200).json({ actividad })
  },
)

// PUT /api/actividades/{id}/coorganizadores/{idUsuario} (docs/diseno-desarrollo-nucleo.md
// §7.6 y §7.7): agrega o promueve a un co-organizador, con su conjunto de
// permisos. Retirar el rol (DELETE) no está en este incremento (ver la nota
// en actividades.service.ts, agregarOPromoverCoorganizador).
actividadesRouter.put(
  '/actividades/:id/coorganizadores/:idUsuario',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const datos = validarDatosAgregarCoorganizador(req.body)

    const actividad = await agregarOPromoverCoorganizador(
      req.params.id as string,
      req.params.idUsuario as string,
      datos.permisos,
      actor.idUsuario,
      membresia,
    )
    res.status(200).json({ actividad })
  },
)
