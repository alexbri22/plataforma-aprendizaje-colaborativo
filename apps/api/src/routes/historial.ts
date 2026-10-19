import { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import { obtenerIdEquipoDeMembresia } from '../services/equipos/equipos.service.js'
import { listarHistorial } from '../services/historial/historial.service.js'

export const historialRouter = Router()

function cursorDeQuery(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : undefined
}

function limiteDeQuery(valor: unknown): number | undefined {
  if (typeof valor !== 'string') return undefined
  const limite = Number.parseInt(valor, 10)
  return Number.isNaN(limite) ? undefined : limite
}

// GET /api/actividades/{id}/historial (nucleo §5.5, §11.2): consulta
// cronológica mínima de este incremento, sin filtros ni agregación (Fase B),
// pero sí paginada por cursor (nucleo §3.1) — ?cursor=<idEvento del último
// evento de la página anterior>&limite=<entero>. 404 si el actor no es
// miembro, resuelto por cargarContextoActividad. Solo resuelve a qué equipo
// integra el actor cuando hace falta (un participante, para acotar lo que ve
// de aportación, P-10): el organizador y los co-organizadores ven todo sin
// importar a cuál integran.
historialRouter.get(
  '/actividades/:id/historial',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    const idEquipoActor =
      membresia.rol === 'participante'
        ? await obtenerIdEquipoDeMembresia(membresia.idMembresia)
        : null
    const pagina = await listarHistorial(req.params.id as string, membresia.rol, idEquipoActor, {
      cursor: cursorDeQuery(req.query.cursor),
      limite: limiteDeQuery(req.query.limite),
    })
    res.status(200).json(pagina)
  },
)
