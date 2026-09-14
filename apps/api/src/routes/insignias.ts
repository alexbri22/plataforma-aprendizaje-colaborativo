import { Router } from 'express'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import { ErrorValidacion } from '../errores.js'
import {
  acumuladoDeUsuario,
  contextoDeReconocimiento,
  guardarMisReconocimientos,
  listarMisReconocimientos,
  listarRecibidos,
  listarRecibidosDeParticipante,
  type ReconocimientoEntrada,
} from '../services/insignias/insignias.service.js'

export const insigniasRouter = Router()

// GET /api/actividades/:id/reconocimientos: lo que el ritual necesita para
// montarse —compañeros, presupuesto, ventana— junto con lo que el actor ya
// guardó, en una sola llamada.
insigniasRouter.get('/actividades/:id/reconocimientos', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const id = req.params.id as string
  const [contexto, reconocimientos] = await Promise.all([
    contextoDeReconocimiento(actor.idUsuario, id),
    listarMisReconocimientos(actor.idUsuario, id),
  ])
  res.status(200).json({ contexto, reconocimientos })
})

// PUT y no POST: reemplaza el conjunto completo. Guardar es idempotente y se
// puede repetir hasta el fin del cierre.
insigniasRouter.put('/actividades/:id/reconocimientos', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const id = req.params.id as string
  const cuerpo = (req.body ?? {}) as { reconocimientos?: unknown }
  if (!Array.isArray(cuerpo.reconocimientos)) {
    throw new ErrorValidacion({ reconocimientos: 'Se espera una lista de reconocimientos.' })
  }
  const entradas = cuerpo.reconocimientos.map((r: unknown) => {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
    return {
      idMembresiaReceptor: String(o.idMembresiaReceptor ?? ''),
      categoria: String(o.categoria ?? ''),
      frase: typeof o.frase === 'string' ? o.frase : '',
    } satisfies ReconocimientoEntrada
  })
  const reconocimientos = await guardarMisReconocimientos(actor.idUsuario, id, entradas)
  res.status(200).json({ reconocimientos })
})

// GET /api/actividades/:id/reconocimientos/recibidos: lo que el actor recibió,
// sin autoría y solo después del cierre.
insigniasRouter.get(
  '/actividades/:id/reconocimientos/recibidos',
  exigirSesion,
  async (req, res) => {
    const actor = req.actor as UsuarioPublico
    const resultado = await listarRecibidos(actor.idUsuario, req.params.id as string)
    res.status(200).json(resultado)
  },
)

// GET /api/actividades/:id/participantes/:idMembresia/reconocimientos: lo que
// recibió un participante, con autoría, para quien organiza.
insigniasRouter.get(
  '/actividades/:id/participantes/:idMembresia/reconocimientos',
  exigirSesion,
  async (req, res) => {
    const actor = req.actor as UsuarioPublico
    const resultado = await listarRecibidosDeParticipante(
      actor.idUsuario,
      req.params.id as string,
      req.params.idMembresia as string,
    )
    res.status(200).json(resultado)
  },
)

// GET /api/insignias/acumulado: puntos del actor por categoría, sumando solo
// actividades cuyo cierre ya terminó.
insigniasRouter.get('/insignias/acumulado', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const acumulado = await acumuladoDeUsuario(actor.idUsuario)
  res.status(200).json({ acumulado })
})
