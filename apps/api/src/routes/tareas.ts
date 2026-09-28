import { Router } from 'express'
import { config } from '../config.js'
import { transicionarActividadesVencidas } from '../services/actividades/actividades.service.js'

// Endpoint que invoca Vercel Cron Jobs (docs/diseno-desarrollo-nucleo.md
// §7.5): no cuelga de /actividades porque no lo llama un actor con sesión,
// sino la plataforma de despliegue con el secreto de vercel.json ("crons").
// GET porque es el único método que Vercel Cron Jobs admite disparar.
export const tareasRouter = Router()

tareasRouter.get('/tareas/transiciones-vencidas', async (req, res) => {
  const encabezado = req.headers.authorization
  if (!config.cronSecret || encabezado !== `Bearer ${config.cronSecret}`) {
    res.status(401).json({ codigo: 'sin_autorizacion', mensaje: 'No autorizado.' })
    return
  }

  const resultado = await transicionarActividadesVencidas()
  res.status(200).json(resultado)
})
