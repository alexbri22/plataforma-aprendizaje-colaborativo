import { MAX_BYTES_FOTO_PERFIL, TIPOS_FOTO_PERFIL } from '@plataforma/shared'
import express, { Router, type Response } from 'express'
import { config } from '../config.js'
import { ErrorUsuarioNoEncontrado } from '../errores.js'
import { limitadorRegistro, limitadorSesion } from '../middleware/limitadorTasa.js'
import { exigirSesion } from '../middleware/sesion.js'
import {
  cerrarSesion,
  iniciarSesion,
  registrarUsuario,
  type SesionCreada,
  type UsuarioPublico,
} from '../services/cuentas/cuentas.service.js'
import {
  actualizarDatosPerfil,
  cambiarContrasena,
  guardarFoto,
  obtenerFoto,
  obtenerPerfilBasico,
  obtenerPerfilPropio,
  quitarFoto,
} from '../services/cuentas/perfil.service.js'
import {
  validarActualizacionPerfil,
  validarCredenciales,
  validarDatosRegistro,
} from '../services/cuentas/validacion.js'
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

// GET /api/usuarios/yo: perfil propio completo, con rangos
// (docs/diseno-desarrollo-nucleo.md §6.3 y §6.5).
cuentasRouter.get('/usuarios/yo', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const usuario = await obtenerPerfilPropio(actor.idUsuario)
  res.status(200).json({ usuario })
})

// PATCH /api/usuarios/yo: edita nombre y apellidos, o cambia la contraseña.
// Cambiarla cierra las demás sesiones (§3.2); la actual sigue viva.
cuentasRouter.patch('/usuarios/yo', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const actualizacion = validarActualizacionPerfil(req.body)

  if (actualizacion.tipo === 'contrasena') {
    await cambiarContrasena(actor.idUsuario, req.idSesion as string, actualizacion.cambio)
    res.status(204).end()
    return
  }

  const usuario = await actualizarDatosPerfil(actor.idUsuario, actualizacion.datos)
  res.status(200).json({ usuario })
})

// PUT /api/usuarios/yo/foto: el cuerpo es la imagen tal cual, con su tipo en
// Content-Type. Sin multipart: es un solo archivo y ya viene reducido por el
// cliente (§6.3), así que un cuerpo crudo evita un analizador más. Si el tipo
// no es uno de los admitidos, express.raw no lo lee y el servicio lo rechaza.
cuentasRouter.put(
  '/usuarios/yo/foto',
  exigirSesion,
  express.raw({ type: [...TIPOS_FOTO_PERFIL], limit: MAX_BYTES_FOTO_PERFIL }),
  async (req, res) => {
    const actor = req.actor as UsuarioPublico
    const tipo = req.headers['content-type']?.split(';')[0].trim() ?? ''
    const contenido = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    const usuario = await guardarFoto(actor.idUsuario, tipo, contenido)
    res.status(200).json({ usuario })
  },
)

cuentasRouter.delete('/usuarios/yo/foto', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const usuario = await quitarFoto(actor.idUsuario)
  res.status(200).json({ usuario })
})

// GET /api/usuarios/{id}/foto: la imagen. Requiere sesión, como el perfil
// del que forma parte. La URL lleva la fecha de la foto (fotoUrl), así que
// se puede cachear sin plazo: una foto nueva es una URL nueva.
cuentasRouter.get('/usuarios/:id/foto', exigirSesion, async (req, res) => {
  const foto = await obtenerFoto(req.params.id as string)
  if (!foto) throw new ErrorUsuarioNoEncontrado()
  res
    .status(200)
    .type(foto.tipo)
    .set('Cache-Control', 'private, max-age=31536000, immutable')
    .send(foto.contenido)
})

// GET /api/usuarios/{id}: perfil básico de otro usuario, nombre y rangos
// (§6.3). Nunca el correo.
cuentasRouter.get('/usuarios/:id', exigirSesion, async (req, res) => {
  const usuario = await obtenerPerfilBasico(req.params.id as string)
  res.status(200).json({ usuario })
})
