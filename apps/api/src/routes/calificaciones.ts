import { esPuntajeValido } from '@plataforma/shared'
import { Router } from 'express'
import { ErrorValidacion } from '../errores.js'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  capturarPuntaje,
  capturarPuntajeDeEquipo,
  listarCalificaciones,
  obtenerDesglose,
  proyectoPorEquipo,
} from '../services/evaluacion/calificaciones.service.js'

export const calificacionesRouter = Router()

// { valor }: de 0 a 100 con a lo más dos decimales, o null para retirarlo.
function valorDe(cuerpo: unknown): number | null {
  const { valor } = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as { valor?: unknown }
  if (valor === null) return null
  if (!esPuntajeValido(valor)) {
    throw new ErrorValidacion({
      valor: 'Debe ser un número de 0 a 100, con a lo más dos decimales.',
    })
  }
  return valor
}

// GET /api/actividades/{id}/calificaciones (docs/diseno-desarrollo-nucleo.md
// §10.5): para quien organiza.
calificacionesRouter.get(
  '/actividades/:id/calificaciones',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const calificaciones = await listarCalificaciones(actividad, membresia)
    res.status(200).json({ calificaciones })
  },
)

// GET .../calificaciones/proyecto: el proyecto de cada equipo, para la
// captura por equipo. Antes de /:idMembresia para que no lo capture.
calificacionesRouter.get(
  '/actividades/:id/calificaciones/proyecto',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const equipos = await proyectoPorEquipo(actividad, membresia)
    res.status(200).json({ equipos })
  },
)

// GET .../calificaciones/{idMembresia}: el desglose de un participante.
calificacionesRouter.get(
  '/actividades/:id/calificaciones/:idMembresia',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const desglose = await obtenerDesglose(actividad, membresia, req.params.idMembresia as string)
    res.status(200).json({ desglose })
  },
)

// PUT .../instrumentos/{idInstrumento}/puntajes/equipos/{idEquipo}: el
// proyecto para todo un equipo (P-40). Antes de la ruta por persona.
calificacionesRouter.put(
  '/actividades/:id/instrumentos/:idInstrumento/puntajes/equipos/:idEquipo',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    await capturarPuntajeDeEquipo(
      actividad,
      membresia,
      req.params.idInstrumento as string,
      req.params.idEquipo as string,
      valorDe(req.body),
      actor.idUsuario,
    )
    res.status(204).end()
  },
)

// PUT .../instrumentos/{idInstrumento}/puntajes/{idMembresia}: captura,
// corrige o retira el puntaje de un participante.
calificacionesRouter.put(
  '/actividades/:id/instrumentos/:idInstrumento/puntajes/:idMembresia',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    await capturarPuntaje(
      actividad,
      membresia,
      req.params.idInstrumento as string,
      req.params.idMembresia as string,
      valorDe(req.body),
      actor.idUsuario,
    )
    res.status(204).end()
  },
)
