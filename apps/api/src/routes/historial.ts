import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import { listarHistorial } from '../services/historial/historial.service.js'

export const historialRouter = Router()

// GET /api/actividades/{id}/historial (nucleo §5.5, §11.2): consulta
// cronológica mínima de este incremento, sin filtros ni agregación (Fase B).
// 404 si el actor no es miembro, resuelto por cargarContextoActividad.
historialRouter.get(
  '/actividades/:id/historial',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const eventos = await listarHistorial(req.params.id as string, membresia.rol)
    res.status(200).json({ eventos })
  },
)
