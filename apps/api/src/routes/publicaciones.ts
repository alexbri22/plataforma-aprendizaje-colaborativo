import {
  LONGITUD_MAXIMA_DESCRIPCION_PUBLICACION,
  LONGITUD_MAXIMA_ENLACE_ELEMENTO,
  MAX_BYTES_ARCHIVO_ELEMENTO,
  TIPOS_ARCHIVO_ELEMENTO,
  esUrlSegura,
} from '@plataforma/shared'
import express, { Router } from 'express'
import { ErrorValidacion } from '../errores.js'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  guardarArchivoPublicacion,
  guardarPublicacion,
  listarPublicaciones,
  obtenerArchivoPublicacion,
  quitarArchivoPublicacion,
} from '../services/seguimiento/publicaciones.service.js'

export const publicacionesRouter = Router()

function validarDatosPublicacion(cuerpo: unknown): { descripcion: string; enlace: string | null } {
  const { descripcion, enlace } = (cuerpo ?? {}) as Record<string, unknown>
  const errores: Record<string, string> = {}
  const texto = typeof descripcion === 'string' ? descripcion.trim() : ''
  if (!texto) errores.descripcion = 'Describe el proyecto.'
  else if (texto.length > LONGITUD_MAXIMA_DESCRIPCION_PUBLICACION) {
    errores.descripcion = `Máximo ${LONGITUD_MAXIMA_DESCRIPCION_PUBLICACION} caracteres.`
  }
  let enlaceLimpio: string | null = null
  if (enlace !== undefined && enlace !== null && enlace !== '') {
    if (
      typeof enlace !== 'string' ||
      enlace.trim().length > LONGITUD_MAXIMA_ENLACE_ELEMENTO ||
      !esUrlSegura(enlace.trim())
    ) {
      errores.enlace = 'Debe ser un enlace completo que empiece con https://'
    } else enlaceLimpio = enlace.trim()
  }
  if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores)
  return { descripcion: texto, enlace: enlaceLimpio }
}

// GET /api/actividades/{id}/publicaciones: los proyectos de todos los equipos.
publicacionesRouter.get(
  '/actividades/:id/publicaciones',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { membresia } = req.contextoActividad!
    res.status(200).json(await listarPublicaciones(req.params.id as string, membresia))
  },
)

// PUT /api/actividades/{id}/publicaciones: publica o corrige el del propio equipo.
publicacionesRouter.put(
  '/actividades/:id/publicaciones',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const publicacion = await guardarPublicacion(
      actividad,
      membresia,
      validarDatosPublicacion(req.body),
      actor.idUsuario,
    )
    res.status(200).json({ publicacion })
  },
)

// PUT/DELETE /api/actividades/{id}/publicaciones/archivo: el archivo del
// propio equipo, como los adjuntos del espacio de equipo (cuerpo crudo y
// nombre en X-Nombre-Archivo).
publicacionesRouter.put(
  '/actividades/:id/publicaciones/archivo',
  exigirSesion,
  cargarContextoActividad,
  express.raw({ type: TIPOS_ARCHIVO_ELEMENTO, limit: MAX_BYTES_ARCHIVO_ELEMENTO }),
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const tipo = req.headers['content-type']?.split(';')[0].trim() ?? ''
    const contenido = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    let nombre = 'archivo'
    const encabezado = req.headers['x-nombre-archivo']
    if (typeof encabezado === 'string') {
      try {
        nombre = decodeURIComponent(encabezado)
      } catch {
        // codificación inválida: se queda el nombre por defecto
      }
    }
    const publicacion = await guardarArchivoPublicacion(
      actividad,
      membresia,
      tipo,
      nombre,
      contenido,
      actor.idUsuario,
    )
    res.status(200).json({ publicacion })
  },
)

publicacionesRouter.delete(
  '/actividades/:id/publicaciones/archivo',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const publicacion = await quitarArchivoPublicacion(actividad, membresia, actor.idUsuario)
    res.status(200).json({ publicacion })
  },
)

// GET /api/actividades/{id}/publicaciones/{idPublicacion}/archivo: PDF e
// imágenes se abren en el navegador; lo demás se descarga.
publicacionesRouter.get(
  '/actividades/:id/publicaciones/:idPublicacion/archivo',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const archivo = await obtenerArchivoPublicacion(
      req.params.id as string,
      req.params.idPublicacion as string,
    )
    const enLinea = archivo.tipo === 'application/pdf' || archivo.tipo.startsWith('image/')
    res
      .status(200)
      .type(archivo.tipo)
      .set({
        'Content-Disposition': `${enLinea ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(Buffer.from(archivo.contenido))
  },
)
