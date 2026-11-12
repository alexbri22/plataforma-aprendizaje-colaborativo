import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  actualizarInstrumento,
  cambiarPeso,
  definirInstrumentos,
  obtenerPonderacion,
} from '../services/evaluacion/ponderacion.service.js'
import {
  validarDatosInstrumento,
  validarDatosInstrumentos,
  validarDatosPeso,
} from '../services/evaluacion/validacion.js'

export const ponderacionRouter = Router()

// GET /api/actividades/{id}/ponderacion (docs/diseno-desarrollo-nucleo.md
// §10.5): cualquier miembro. Lo que vale cada parte no es un secreto: el
// participante ve el desglose de su propia calificación con estos pesos.
ponderacionRouter.get(
  '/actividades/:id/ponderacion',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const ponderacion = await obtenerPonderacion(req.params.id as string)
    res.status(200).json({ ponderacion })
  },
)

// PATCH /api/actividades/{id}/componentes/{idComponente} y
// .../aspectos/{idAspecto}: el peso de una parte.
for (const parte of ['componente', 'aspecto'] as const) {
  ponderacionRouter.patch(
    `/actividades/:id/${parte}s/:idParte`,
    exigirSesion,
    cargarContextoActividad,
    async (req, res) => {
      const { actividad, membresia } = req.contextoActividad!
      const actor = req.actor as UsuarioPublico
      const { peso } = validarDatosPeso(req.body)

      const ponderacion = await cambiarPeso(
        actividad,
        parte,
        req.params.idParte as string,
        peso,
        actor.idUsuario,
        membresia,
      )
      res.status(200).json({ ponderacion })
    },
  )
}

// PUT /api/actividades/{id}/aspectos/{idAspecto}/instrumentos: el tipo de
// instrumento de un aspecto del proceso y su periodicidad. Cuelga de la
// actividad y no de /aspectos/{id} para que el contexto de actividad del
// middleware resuelva la membresía.
ponderacionRouter.put(
  '/actividades/:id/aspectos/:idAspecto/instrumentos',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const definicion = validarDatosInstrumentos(req.body)

    const ponderacion = await definirInstrumentos(
      actividad,
      req.params.idAspecto as string,
      definicion,
      actor.idUsuario,
      membresia,
    )
    res.status(200).json({ ponderacion })
  },
)

// PATCH /api/actividades/{id}/instrumentos/{idInstrumento}: formato, enlace
// y fecha de una instancia del calendario.
ponderacionRouter.patch(
  '/actividades/:id/instrumentos/:idInstrumento',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const cambios = validarDatosInstrumento(req.body)

    const ponderacion = await actualizarInstrumento(
      actividad,
      req.params.idInstrumento as string,
      cambios,
      actor.idUsuario,
      membresia,
    )
    res.status(200).json({ ponderacion })
  },
)
