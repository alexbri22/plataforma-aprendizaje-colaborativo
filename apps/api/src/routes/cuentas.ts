import { Router, type Response } from 'express'
import { config } from '../config.js'
import { limitadorRegistro, limitadorSesion } from '../middleware/limitadorTasa.js'
import { exigirSesion } from '../middleware/sesion.js'
import {
  cerrarSesion,
  iniciarSesion,
  registrarUsuario,
  type SesionCreada,
} from '../services/cuentas/cuentas.service.js'
import { validarCredenciales, validarDatosRegistro } from '../services/cuentas/validacion.js'
import { opcionesCookieSesion } from '../services/cuentas/sesiones.js'

export const cuentasRouter = Router()

function establecerCookieSesion(res: Response, sesion: SesionCreada): void {
  res.cookie(config.sesion.nombreCookie, sesion.id, {
    ...opcionesCookieSesion,
    expires: sesion.expiraEn,
  })
}

// POST /api/usuarios (docs/diseno-desarrollo-nucleo.md §6.5): registra una
// cuenta y, como fija la pantalla de Registro (§6.6), inicia sesión.
cuentasRouter.post('/usuarios', limitadorRegistro, async (req, res) => {
  const datos = validarDatosRegistro(req.body)
  const { usuario, sesion } = await registrarUsuario(datos)
  establecerCookieSesion(res, sesion)
  res.status(201).json({ usuario })
})

// POST /api/sesion: inicia sesión y emite la cookie.
cuentasRouter.post('/sesion', limitadorSesion, async (req, res) => {
  const credenciales = validarCredenciales(req.body)
  const { usuario, sesion } = await iniciarSesion(credenciales)
  establecerCookieSesion(res, sesion)
  res.status(200).json({ usuario })
})

// DELETE /api/sesion: cierra la sesión y elimina el registro en servidor.
cuentasRouter.delete('/sesion', exigirSesion, async (req, res) => {
  await cerrarSesion(req.idSesion as string)
  res.clearCookie(config.sesion.nombreCookie, { path: '/' })
  res.status(204).end()
})

// GET /api/sesion: devuelve el actor actual y su tipo de cuenta.
cuentasRouter.get('/sesion', exigirSesion, (req, res) => {
  res.status(200).json({ usuario: req.actor })
})
