import type { ElementoEspacioEquipo } from '@plataforma/shared'
import {
  ELEMENTOS_ESPACIO_EQUIPO,
  MAX_BYTES_ARCHIVO_ELEMENTO,
  TIPOS_ARCHIVO_ELEMENTO,
} from '@plataforma/shared'
import express, { Router } from 'express'
import { exigirSesion } from '../middleware/sesion.js'
import {
  crearElemento,
  editarElemento,
  eliminarElemento,
  guardarArchivoElemento,
  listarElementos,
  obtenerArchivoElemento,
  quitarArchivoElemento,
} from '../services/seguimiento/elementos.service.js'
import {
  validarDatosActualizarElemento,
  validarDatosCrearElemento,
} from '../services/seguimiento/validacion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'

export const elementosRouter = Router()

function tipoDeQuery(valor: unknown): ElementoEspacioEquipo | undefined {
  return typeof valor === 'string' &&
    (ELEMENTOS_ESPACIO_EQUIPO as readonly string[]).includes(valor)
    ? (valor as ElementoEspacioEquipo)
    : undefined
}

// GET /api/equipos/{id}/elementos (nucleo §9.4): el espacio del equipo,
// filtrable por tipo. Igual que /equipos/{id}, no cuelga de
// cargarContextoActividad: el servicio resuelve equipo, actividad y
// membresía por su cuenta.
elementosRouter.get('/equipos/:id/elementos', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const elementos = await listarElementos(
    req.params.id as string,
    actor.idUsuario,
    tipoDeQuery(req.query.tipo),
  )
  res.status(200).json({ elementos })
})

// POST /api/equipos/{id}/elementos: crea una meta, un avance o un recurso.
elementosRouter.post('/equipos/:id/elementos', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const { tipo, contenido, enlace } = validarDatosCrearElemento(req.body)
  const elemento = await crearElemento(
    req.params.id as string,
    tipo,
    contenido,
    enlace,
    actor.idUsuario,
  )
  res.status(201).location(`/api/elementos/${elemento.id}`).json({ elemento })
})

// PATCH /api/elementos/{id}: edita el contenido y, si viene, el enlace.
elementosRouter.patch('/elementos/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const cambios = validarDatosActualizarElemento(req.body)
  const elemento = await editarElemento(req.params.id as string, cambios, actor.idUsuario)
  res.status(200).json({ elemento })
})

// DELETE /api/elementos/{id}: el evento conserva el contenido eliminado.
elementosRouter.delete('/elementos/:id', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  await eliminarElemento(req.params.id as string, actor.idUsuario)
  res.status(204).end()
})

// PUT /api/elementos/{id}/archivo: el cuerpo es el archivo tal cual, con su
// tipo en Content-Type (mismo esquema que el PDF de los recursos, sin
// multipart). El nombre original viaja en X-Nombre-Archivo con
// encodeURIComponent, porque un encabezado HTTP no admite caracteres fuera
// de ASCII.
elementosRouter.put(
  '/elementos/:id/archivo',
  exigirSesion,
  express.raw({ type: TIPOS_ARCHIVO_ELEMENTO, limit: MAX_BYTES_ARCHIVO_ELEMENTO }),
  async (req, res) => {
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
    const elemento = await guardarArchivoElemento(
      req.params.id as string,
      tipo,
      nombre,
      contenido,
      actor.idUsuario,
    )
    res.status(200).json({ elemento })
  },
)

// GET /api/elementos/{id}/archivo: PDF e imágenes se abren en el navegador;
// lo demás se descarga. private, no-store: es contenido de un equipo.
elementosRouter.get('/elementos/:id/archivo', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const archivo = await obtenerArchivoElemento(req.params.id as string, actor.idUsuario)
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
})

elementosRouter.delete('/elementos/:id/archivo', exigirSesion, async (req, res) => {
  const actor = req.actor as UsuarioPublico
  const elemento = await quitarArchivoElemento(req.params.id as string, actor.idUsuario)
  res.status(200).json({ elemento })
})
