import { Router } from 'express'
import { POR_PAGINA_ADMIN, POR_PAGINA_PUBLICA } from '@plataforma/shared'
import { exigirAdministrador } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import { validarVersionFicha } from '../services/formacion/cursos.validacion.js'
import {
  actualizarRuta,
  crearRuta,
  eliminarRuta,
  listarRutasAdmin,
  listarRutasPublicadas,
  obtenerRutaAdmin,
  obtenerRutaPublicada,
  reemplazarCursosRuta,
} from '../services/formacion/rutas.service.js'
import { validarCursosRuta, validarDatosRuta } from '../services/formacion/rutas.validacion.js'
import { validarPaginacion } from '../services/formacion/validacion.js'

// Rutas de aprendizaje (docs/diseno-desarrollo-formacion.md §4.1, §12.3 y la
// nota del incremento 4). Las públicas no exigen sesión y solo ven rutas
// publicadas; las de administración exigen sesión de administrador. La
// recomendación personal vive en progreso.ts (/api/me/rutas/recomendadas).
export const rutasRouter = Router()
export const adminRutasRouter = Router()

// GET /api/rutas?pagina&porPagina: catálogo publicado, la destacada primero.
rutasRouter.get('/rutas', async (req, res) => {
  const pagina = validarPaginacion(req.query as Record<string, unknown>, POR_PAGINA_PUBLICA)
  res.status(200).json(await listarRutasPublicadas(pagina))
})

// GET /api/rutas/:id: ficha pública con sus cursos en orden.
rutasRouter.get('/rutas/:id', async (req, res) => {
  res.status(200).json({ ruta: await obtenerRutaPublicada(req.params.id as string) })
})

// ---- Administración (/api/admin) ----

// GET /api/admin/rutas?pagina&porPagina: todas, en cualquier estatus.
adminRutasRouter.get('/rutas', exigirAdministrador, async (req, res) => {
  const pagina = validarPaginacion(req.query as Record<string, unknown>, POR_PAGINA_ADMIN)
  res.status(200).json(await listarRutasAdmin(pagina))
})

adminRutasRouter.get('/rutas/:id', exigirAdministrador, async (req, res) => {
  res.status(200).json({ ruta: await obtenerRutaAdmin(req.params.id as string) })
})

// POST /api/admin/rutas: alta de la ficha, en borrador y sin cursos.
adminRutasRouter.post('/rutas', exigirAdministrador, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const ruta = await crearRuta(actor.idUsuario, validarDatosRuta(req.body, false))
  res.status(201).json({ ruta })
})

// PATCH /api/admin/rutas/:id: ficha, estatus o destacada, con versionFicha.
adminRutasRouter.patch('/rutas/:id', exigirAdministrador, async (req, res) => {
  const ruta = await actualizarRuta(
    req.params.id as string,
    validarDatosRuta(req.body, true),
    validarVersionFicha(req.body),
  )
  res.status(200).json({ ruta })
})

// PUT /api/admin/rutas/:id/cursos { cursos: [ids en orden], versionFicha? }:
// reemplaza la lista completa.
adminRutasRouter.put('/rutas/:id/cursos', exigirAdministrador, async (req, res) => {
  const ruta = await reemplazarCursosRuta(
    req.params.id as string,
    validarCursosRuta(req.body),
    validarVersionFicha(req.body),
  )
  res.status(200).json({ ruta })
})

adminRutasRouter.delete('/rutas/:id', exigirAdministrador, async (req, res) => {
  await eliminarRuta(req.params.id as string)
  res.status(204).end()
})
