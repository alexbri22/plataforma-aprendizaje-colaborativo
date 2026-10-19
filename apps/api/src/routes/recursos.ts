import express, { Router, type Response } from 'express'
import {
  MAX_BYTES_ARCHIVO_RECURSO,
  POR_PAGINA_ADMIN,
  POR_PAGINA_PUBLICA,
  TIPOS_ARCHIVO_RECURSO,
} from '@plataforma/shared'
import { exigirAdministrador } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  actualizarRecurso,
  crearRecurso,
  eliminarRecurso,
  guardarArchivoRecurso,
  listarRecursosAdmin,
  listarRecursosPublicados,
  obtenerArchivoAdmin,
  obtenerArchivoPublicado,
  obtenerRecursoAdmin,
  obtenerRecursoPublicado,
  quitarArchivoRecurso,
} from '../services/formacion/recursos.service.js'
import {
  validarDatosRecurso,
  validarFiltrosRecursos,
  validarPaginacion,
} from '../services/formacion/validacion.js'

// Biblioteca de recursos formativos (docs/diseno-desarrollo-formacion.md §9.3
// y §12.6). Las rutas públicas no exigen sesión (concepto §2.6: el contenido
// formativo es visible sin cuenta); las administrativas exigen sesión de
// administrador en cada endpoint.
/**
 * Límite del cuerpo JSON de las rutas de administración de recursos. El de
 * express.json() por defecto (100 KB) es menor que lo que la validación
 * permite: los textos de un recurso suman unos 71 000 caracteres (contenido
 * 20 000, transcripción 50 000, más título, resumen, fuente y licencia). En el
 * peor caso cada carácter ocupa 4 bytes en UTF-8, o 6 si JSON lo escapa como
 * \uXXXX: ~425 KB. Con 1 MB todo lo válido cabe y la validación de campos es
 * la que responde; sigue muy por debajo del tope de 4.5 MB de Vercel.
 */
export const LIMITE_JSON_RECURSOS = '1mb'

export const recursosRouter = Router()
export const adminRecursosRouter = Router()

// GET /api/recursos?seccion&area&tipo&q&pagina&porPagina: catálogo
// publicado, sin el cuerpo, por páginas. `tipo` admite varios separados por
// coma. Responde { recursos, paginacion: { pagina, porPagina, total,
// totalPaginas } }.
recursosRouter.get('/recursos', async (req, res) => {
  const query = req.query as Record<string, unknown>
  const filtros = validarFiltrosRecursos(query)
  const pagina = validarPaginacion(query, POR_PAGINA_PUBLICA)
  res.status(200).json(await listarRecursosPublicados(filtros, pagina))
})

// GET /api/recursos/:id: un recurso publicado completo. Borradores y
// retirados responden 404, igual que un id inexistente.
recursosRouter.get('/recursos/:id', async (req, res) => {
  const recurso = await obtenerRecursoPublicado(req.params.id as string)
  res.status(200).json({ recurso })
})

/** Envía un PDF en línea, para que el navegador lo abra en su visor.
 * nosniff para que nunca lo interprete como otra cosa que el tipo declarado.
 * Express agrega un ETag, así que una revalidación de un archivo que no
 * cambió responde 304 sin volver a mandar los bytes. */
function enviarArchivo(
  res: Response,
  archivo: { contenido: Uint8Array; tipo: string; nombre: string },
  cacheControl: string,
) {
  res
    .status(200)
    .type(archivo.tipo)
    .set({
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    })
    .send(Buffer.from(archivo.contenido))
}

// GET /api/recursos/:id/archivo: el PDF de un recurso publicado. no-cache
// (no "no-store"): el navegador y las cachés compartidas pueden guardarlo,
// pero deben preguntar al servidor antes de reusarlo. Así, retirar o borrar
// el recurso corta el acceso de inmediato (la revalidación recibe 404), y un
// archivo sin cambios se sigue sirviendo con un 304 barato.
recursosRouter.get('/recursos/:id/archivo', async (req, res) => {
  const archivo = await obtenerArchivoPublicado(req.params.id as string)
  enviarArchivo(res, archivo, 'public, no-cache')
})

// ---- Administración (/api/admin) ----

// GET /api/admin/recursos?pagina&porPagina: todos, en cualquier estatus, por
// páginas. Misma forma de respuesta que el catálogo público.
adminRecursosRouter.get('/recursos', exigirAdministrador, async (req, res) => {
  const pagina = validarPaginacion(req.query as Record<string, unknown>, POR_PAGINA_ADMIN)
  res.status(200).json(await listarRecursosAdmin(pagina))
})

adminRecursosRouter.get('/recursos/:id', exigirAdministrador, async (req, res) => {
  const recurso = await obtenerRecursoAdmin(req.params.id as string)
  res.status(200).json({ recurso })
})

// POST /api/admin/recursos: alta. Nace en borrador salvo que el cuerpo pida
// publicarlo y cumpla los mínimos.
adminRecursosRouter.post('/recursos', exigirAdministrador, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const datos = validarDatosRecurso(req.body, false)
  const recurso = await crearRecurso(actor.idUsuario, datos)
  res.status(201).json({ recurso })
})

// PATCH /api/admin/recursos/:id: editar, reordenar, publicar o retirar.
adminRecursosRouter.patch('/recursos/:id', exigirAdministrador, async (req, res) => {
  const cambios = validarDatosRecurso(req.body, true)
  const recurso = await actualizarRecurso(req.params.id as string, cambios)
  res.status(200).json({ recurso })
})

// DELETE /api/admin/recursos/:id: borra el recurso en cualquier estatus,
// junto con su archivo. Irreversible; retirar es la alternativa reversible.
adminRecursosRouter.delete('/recursos/:id', exigirAdministrador, async (req, res) => {
  await eliminarRecurso(req.params.id as string)
  res.status(204).end()
})

// PUT /api/admin/recursos/:id/archivo: el cuerpo es el PDF tal cual (mismo
// esquema que la foto de perfil, sin multipart). El nombre original viaja en
// X-Nombre-Archivo codificado con encodeURIComponent, porque un encabezado
// HTTP no admite caracteres fuera de ASCII.
adminRecursosRouter.put(
  '/recursos/:id/archivo',
  exigirAdministrador,
  express.raw({ type: [...TIPOS_ARCHIVO_RECURSO], limit: MAX_BYTES_ARCHIVO_RECURSO }),
  async (req, res) => {
    const tipo = req.headers['content-type']?.split(';')[0].trim() ?? ''
    const contenido = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    let nombre = 'recurso.pdf'
    const encabezado = req.headers['x-nombre-archivo']
    if (typeof encabezado === 'string') {
      try {
        nombre = decodeURIComponent(encabezado)
      } catch {
        // codificación inválida: se queda el nombre por defecto
      }
    }
    const recurso = await guardarArchivoRecurso(req.params.id as string, tipo, nombre, contenido)
    res.status(200).json({ recurso })
  },
)

// GET /api/admin/recursos/:id/archivo: el PDF en cualquier estatus, para
// revisarlo antes de publicar. private, no-store: un borrador no debe quedar
// en ninguna caché.
adminRecursosRouter.get('/recursos/:id/archivo', exigirAdministrador, async (req, res) => {
  const archivo = await obtenerArchivoAdmin(req.params.id as string)
  enviarArchivo(res, archivo, 'private, no-store')
})

adminRecursosRouter.delete('/recursos/:id/archivo', exigirAdministrador, async (req, res) => {
  const recurso = await quitarArchivoRecurso(req.params.id as string)
  res.status(200).json({ recurso })
})
