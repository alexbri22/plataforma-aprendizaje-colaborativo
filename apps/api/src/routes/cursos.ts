import { Router } from 'express'
import { POR_PAGINA_ADMIN, POR_PAGINA_PUBLICA } from '@plataforma/shared'
import { exigirAdministrador } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  actualizarCurso,
  actualizarLeccion,
  agregarLeccion,
  crearCurso,
  eliminarCurso,
  eliminarLeccion,
  listarCursosAdmin,
  listarCursosPublicados,
  obtenerCursoAdmin,
  obtenerCursoPublicado,
  obtenerLeccionPublica,
  reordenarLecciones,
} from '../services/formacion/cursos.service.js'
import {
  validarDatosCurso,
  validarDatosLeccion,
  validarFiltrosCursos,
  validarOrdenLecciones,
} from '../services/formacion/cursos.validacion.js'
import { validarPaginacion } from '../services/formacion/validacion.js'

// Cursos (docs/diseno-desarrollo-formacion.md §9.3 y §12.3). Las rutas
// públicas no exigen sesión y solo ven cursos publicados: leer un curso es
// libre, lo único que pedirá cuenta es guardar el progreso. Las de
// administración exigen sesión de administrador; sus operaciones sobre
// lecciones responden con el curso completo, para que el editor se pinte de
// nuevo con una sola respuesta.
export const cursosRouter = Router()
export const adminCursosRouter = Router()

// GET /api/cursos?area&nivel&elemento&q&pagina&porPagina: catálogo publicado.
cursosRouter.get('/cursos', async (req, res) => {
  const query = req.query as Record<string, unknown>
  const filtros = validarFiltrosCursos(query)
  const pagina = validarPaginacion(query, POR_PAGINA_PUBLICA)
  res.status(200).json(await listarCursosPublicados(filtros, pagina))
})

// GET /api/cursos/:id: ficha e índice de lecciones, sin su contenido.
cursosRouter.get('/cursos/:id', async (req, res) => {
  res.status(200).json({ curso: await obtenerCursoPublicado(req.params.id as string) })
})

// GET /api/cursos/:id/lecciones/:idLeccion: contenido de una lección, con el
// recurso completo si lo reutiliza y sus vecinas para navegar.
cursosRouter.get('/cursos/:id/lecciones/:idLeccion', async (req, res) => {
  const leccion = await obtenerLeccionPublica(
    req.params.id as string,
    req.params.idLeccion as string,
  )
  res.status(200).json({ leccion })
})

// ---- Administración (/api/admin) ----

// GET /api/admin/cursos?pagina&porPagina: todos, en cualquier estatus.
adminCursosRouter.get('/cursos', exigirAdministrador, async (req, res) => {
  const pagina = validarPaginacion(req.query as Record<string, unknown>, POR_PAGINA_ADMIN)
  res.status(200).json(await listarCursosAdmin(pagina))
})

adminCursosRouter.get('/cursos/:id', exigirAdministrador, async (req, res) => {
  res.status(200).json({ curso: await obtenerCursoAdmin(req.params.id as string) })
})

// POST /api/admin/cursos: alta de la ficha. Nace en borrador; las lecciones
// se agregan después.
adminCursosRouter.post('/cursos', exigirAdministrador, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const curso = await crearCurso(actor.idUsuario, validarDatosCurso(req.body, false))
  res.status(201).json({ curso })
})

// PATCH /api/admin/cursos/:id: editar la ficha, publicar o retirar.
adminCursosRouter.patch('/cursos/:id', exigirAdministrador, async (req, res) => {
  const curso = await actualizarCurso(req.params.id as string, validarDatosCurso(req.body, true))
  res.status(200).json({ curso })
})

// DELETE /api/admin/cursos/:id: borra el curso y sus lecciones, no los
// recursos que usaba.
adminCursosRouter.delete('/cursos/:id', exigirAdministrador, async (req, res) => {
  await eliminarCurso(req.params.id as string)
  res.status(204).end()
})

// POST /api/admin/cursos/:id/lecciones: agrega una lección al final.
adminCursosRouter.post('/cursos/:id/lecciones', exigirAdministrador, async (req, res) => {
  const curso = await agregarLeccion(req.params.id as string, validarDatosLeccion(req.body, false))
  res.status(201).json({ curso })
})

// PUT /api/admin/cursos/:id/lecciones/orden: { lecciones: [ids en orden] }.
// Va antes de la ruta con :idLeccion para que "orden" no se lea como un id.
adminCursosRouter.put('/cursos/:id/lecciones/orden', exigirAdministrador, async (req, res) => {
  const curso = await reordenarLecciones(req.params.id as string, validarOrdenLecciones(req.body))
  res.status(200).json({ curso })
})

adminCursosRouter.patch(
  '/cursos/:id/lecciones/:idLeccion',
  exigirAdministrador,
  async (req, res) => {
    const curso = await actualizarLeccion(
      req.params.id as string,
      req.params.idLeccion as string,
      validarDatosLeccion(req.body, true),
    )
    res.status(200).json({ curso })
  },
)

adminCursosRouter.delete(
  '/cursos/:id/lecciones/:idLeccion',
  exigirAdministrador,
  async (req, res) => {
    const curso = await eliminarLeccion(req.params.id as string, req.params.idLeccion as string)
    res.status(200).json({ curso })
  },
)
