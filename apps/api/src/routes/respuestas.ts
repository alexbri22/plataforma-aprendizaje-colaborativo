import { MAX_BYTES_ARCHIVO_ELEMENTO, TIPOS_ARCHIVO_ELEMENTO } from '@plataforma/shared'
import express, { Router } from 'express'
import { cargarContextoActividad } from '../middleware/contextoActividad.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  guardarArchivoEntrega,
  guardarEntrega,
  listarEntregas,
  obtenerArchivoEntrega,
  quitarArchivoEntrega,
} from '../services/evaluacion/entregas.service.js'
import {
  avanceDeInstrumentos,
  cumplimientoDeAspecto,
  listarMisInstrumentos,
  listarRespuestas,
  misResultadosPares,
  responderInstrumento,
  resultadosPares,
} from '../services/evaluacion/respuestas.service.js'
import { ErrorValidacion } from '../errores.js'
import { validarDatosEntrega } from '../services/evaluacion/validacion.js'

export const respuestasRouter = Router()

// GET /api/actividades/{id}/mis-instrumentos (docs/diseno-desarrollo-nucleo.md
// §10.5): los instrumentos del proceso colaborativo que le tocan a quien
// participa, con su estado.
respuestasRouter.get(
  '/actividades/:id/mis-instrumentos',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const instrumentos = await listarMisInstrumentos(actividad, membresia)
    res.status(200).json({ instrumentos })
  },
)

// GET /api/actividades/{id}/cumplimiento-instrumentos: para quien organiza,
// cuántos completaron cada instancia (Operación de la planeación).
respuestasRouter.get(
  '/actividades/:id/cumplimiento-instrumentos',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const instrumentos = await avanceDeInstrumentos(actividad, membresia)
    res.status(200).json({ instrumentos })
  },
)

// GET /api/actividades/{id}/instrumentos/{idInstrumento}/respuestas: las
// propias para quien participa; todas para quien organiza.
respuestasRouter.get(
  '/actividades/:id/instrumentos/:idInstrumento/respuestas',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const respuestas = await listarRespuestas(
      actividad,
      membresia,
      req.params.idInstrumento as string,
    )
    res.status(200).json({ respuestas })
  },
)

// PUT /api/actividades/{id}/instrumentos/{idInstrumento}/respuestas: responde
// o vuelve a responder una autoevaluación completa. Cuelga de la actividad,
// como el resto de Evaluación, para que el middleware resuelva la membresía.
// La forma de las respuestas depende de la plantilla, así que la valida el
// servicio.
respuestasRouter.put(
  '/actividades/:id/instrumentos/:idInstrumento/respuestas',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const cuerpo = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      respuestas?: unknown
    }
    const respuestas = await responderInstrumento(
      actividad,
      membresia,
      req.params.idInstrumento as string,
      cuerpo.respuestas,
      actor.idUsuario,
    )
    res.status(200).json({ respuestas })
  },
)

// GET /api/actividades/{id}/aspectos/{idAspecto}/cumplimiento: para quien
// organiza, quiénes completaron cada instancia del aspecto.
respuestasRouter.get(
  '/actividades/:id/aspectos/:idAspecto/cumplimiento',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const instrumentos = await cumplimientoDeAspecto(
      actividad,
      membresia,
      req.params.idAspecto as string,
    )
    res.status(200).json({ instrumentos })
  },
)

// GET .../instrumentos/{idInstrumento}/entregas: la propia o, para quien
// organiza, todas.
respuestasRouter.get(
  '/actividades/:id/instrumentos/:idInstrumento/entregas',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const entregas = await listarEntregas(actividad, membresia, req.params.idInstrumento as string)
    res.status(200).json({ entregas })
  },
)

// PUT .../instrumentos/{idInstrumento}/entrega: registra o corrige la entrega
// propia de una actividad externa.
respuestasRouter.put(
  '/actividades/:id/instrumentos/:idInstrumento/entrega',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const actor = req.actor as UsuarioPublico
    const entrega = await guardarEntrega(
      actividad,
      membresia,
      req.params.idInstrumento as string,
      validarDatosEntrega(req.body),
      actor.idUsuario,
    )
    res.status(200).json({ entrega })
  },
)

// PUT .../entrega/archivo: mismo esquema que el archivo de un elemento (el
// cuerpo es el archivo; el nombre, en X-Nombre-Archivo).
respuestasRouter.put(
  '/actividades/:id/instrumentos/:idInstrumento/entrega/archivo',
  exigirSesion,
  cargarContextoActividad,
  express.raw({ type: TIPOS_ARCHIVO_ELEMENTO, limit: MAX_BYTES_ARCHIVO_ELEMENTO }),
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
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
    const entrega = await guardarArchivoEntrega(
      actividad,
      membresia,
      req.params.idInstrumento as string,
      tipo,
      nombre,
      contenido,
    )
    res.status(200).json({ entrega })
  },
)

respuestasRouter.delete(
  '/actividades/:id/instrumentos/:idInstrumento/entrega/archivo',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const entrega = await quitarArchivoEntrega(
      actividad,
      membresia,
      req.params.idInstrumento as string,
    )
    res.status(200).json({ entrega })
  },
)

// GET .../entregas/{idEntrega}/archivo: PDF e imágenes se abren en el
// navegador; lo demás se descarga.
respuestasRouter.get(
  '/actividades/:id/instrumentos/:idInstrumento/entregas/:idEntrega/archivo',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const archivo = await obtenerArchivoEntrega(
      actividad,
      membresia,
      req.params.idInstrumento as string,
      req.params.idEntrega as string,
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

// GET .../instrumentos/{idInstrumento}/pares?idEquipo=: para quien organiza,
// el resultado de pares de cada participante del equipo, con su
// autoasignación como contraste (nucleo §10.2).
respuestasRouter.get(
  '/actividades/:id/instrumentos/:idInstrumento/pares',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const idEquipo = req.query.idEquipo
    if (typeof idEquipo !== 'string' || !idEquipo) {
      throw new ErrorValidacion({ idEquipo: 'Indica el equipo.' })
    }
    const resultados = await resultadosPares(
      actividad,
      membresia,
      req.params.idInstrumento as string,
      idEquipo,
    )
    res.status(200).json({ resultados })
  },
)

// GET .../instrumentos/{idInstrumento}/pares/mios: para quien participa, lo
// que le dieron sus compañeros en conjunto, con dos o más respuestas.
respuestasRouter.get(
  '/actividades/:id/instrumentos/:idInstrumento/pares/mios',
  exigirSesion,
  cargarContextoActividad,
  async (req, res) => {
    const { actividad, membresia } = req.contextoActividad!
    const resultados = await misResultadosPares(
      actividad,
      membresia,
      req.params.idInstrumento as string,
    )
    res.status(200).json({ resultados })
  },
)
