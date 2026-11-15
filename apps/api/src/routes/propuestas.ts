import { Router, type Request } from 'express'
import { exigirAdministrador, exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import { autor } from '../services/formacion/acceso.js'
import {
  actualizarCurso,
  actualizarLeccion,
  agregarLeccion,
  eliminarCurso,
  eliminarLeccion,
  reordenarLecciones,
} from '../services/formacion/cursos.service.js'
import {
  validarDatosLeccion,
  validarOrdenLecciones,
  validarVersionFicha,
} from '../services/formacion/cursos.validacion.js'
import {
  actualizarRecurso,
  eliminarRecurso,
  guardarArchivoRecurso,
  obtenerArchivoAdmin,
  quitarArchivoRecurso,
} from '../services/formacion/recursos.service.js'
import {
  cancelarEnvio,
  contarAvisosPendientes,
  crearPropuestaCurso,
  crearPropuestaRecurso,
  decidir,
  enviarARevision,
  listarCola,
  listarMisPropuestas,
  marcarDecisionVista,
  obtenerMiPropuestaCurso,
  obtenerMiPropuestaRecurso,
  obtenerParaRevision,
} from '../services/formacion/revision.service.js'
import {
  validarDatosPropuestaCurso,
  validarDatosPropuestaRecurso,
  validarDecision,
  validarTipoContenido,
} from '../services/formacion/revision.validacion.js'
import { archivoSubido, enviarArchivo, recibirArchivo } from './recursos.js'

// Autoría abierta con revisión (docs/diseno-desarrollo-formacion.md §6.3,
// §9.3, §12.3 y nota del incremento 6). El autor trabaja en /api/me/propuestas,
// siempre sobre lo suyo: ninguna ruta recibe el id de otra persona y una
// propuesta ajena responde 404. El administrador revisa en
// /api/admin/revisiones. Quién ve y edita qué lo decide el servicio con la fila
// bloqueada (acceso.ts); aquí solo se dice quién llama.
export const propuestasRouter = Router()
export const adminRevisionesRouter = Router()

function idDe(req: Request): string {
  return (req.actor as UsuarioPublico).idUsuario
}

function param(req: Request, nombre: string): string {
  return req.params[nombre] as string
}

// ---- Lista y avisos ----

// GET /api/me/propuestas: mis propuestas con su estado y su última decisión.
propuestasRouter.get('/me/propuestas', exigirSesion, async (req, res) => {
  res.status(200).json(await listarMisPropuestas(idDe(req)))
})

// GET /api/me/propuestas/avisos: cuántas decisiones no he visto.
propuestasRouter.get('/me/propuestas/avisos', exigirSesion, async (req, res) => {
  res.status(200).json({ pendientes: await contarAvisosPendientes(idDe(req)) })
})

// ---- Recursos ----

propuestasRouter.post('/me/propuestas/recursos', exigirSesion, async (req, res) => {
  const recurso = await crearPropuestaRecurso(
    idDe(req),
    validarDatosPropuestaRecurso(req.body, false),
  )
  res.status(201).json({ recurso })
})

propuestasRouter.get('/me/propuestas/recursos/:id', exigirSesion, async (req, res) => {
  res.status(200).json({ recurso: await obtenerMiPropuestaRecurso(param(req, 'id'), idDe(req)) })
})

// PATCH: editar mientras la preparo (borrador o con cambios solicitados).
propuestasRouter.patch('/me/propuestas/recursos/:id', exigirSesion, async (req, res) => {
  await actualizarRecurso(
    param(req, 'id'),
    validarDatosPropuestaRecurso(req.body, true),
    autor(idDe(req)),
    validarVersionFicha(req.body),
  )
  res.status(200).json({ recurso: await obtenerMiPropuestaRecurso(param(req, 'id'), idDe(req)) })
})

propuestasRouter.delete('/me/propuestas/recursos/:id', exigirSesion, async (req, res) => {
  await eliminarRecurso(param(req, 'id'), autor(idDe(req)))
  res.status(204).end()
})

// El PDF de mi propuesta: verlo, subirlo y quitarlo. Mismo esquema que el
// panel.
propuestasRouter.get('/me/propuestas/recursos/:id/archivo', exigirSesion, async (req, res) => {
  const archivo = await obtenerArchivoAdmin(param(req, 'id'), autor(idDe(req)))
  enviarArchivo(res, archivo, 'private, no-store')
})

propuestasRouter.put(
  '/me/propuestas/recursos/:id/archivo',
  exigirSesion,
  recibirArchivo,
  async (req, res) => {
    const { tipo, nombre, contenido } = archivoSubido(req)
    await guardarArchivoRecurso(param(req, 'id'), tipo, nombre, contenido, autor(idDe(req)))
    res.status(200).json({ recurso: await obtenerMiPropuestaRecurso(param(req, 'id'), idDe(req)) })
  },
)

propuestasRouter.delete('/me/propuestas/recursos/:id/archivo', exigirSesion, async (req, res) => {
  await quitarArchivoRecurso(param(req, 'id'), autor(idDe(req)))
  res.status(200).json({ recurso: await obtenerMiPropuestaRecurso(param(req, 'id'), idDe(req)) })
})

// ---- Cursos ----

propuestasRouter.post('/me/propuestas/cursos', exigirSesion, async (req, res) => {
  const curso = await crearPropuestaCurso(idDe(req), validarDatosPropuestaCurso(req.body, false))
  res.status(201).json({ curso })
})

propuestasRouter.get('/me/propuestas/cursos/:id', exigirSesion, async (req, res) => {
  res.status(200).json({ curso: await obtenerMiPropuestaCurso(param(req, 'id'), idDe(req)) })
})

propuestasRouter.patch('/me/propuestas/cursos/:id', exigirSesion, async (req, res) => {
  await actualizarCurso(
    param(req, 'id'),
    validarDatosPropuestaCurso(req.body, true),
    validarVersionFicha(req.body),
    autor(idDe(req)),
  )
  res.status(200).json({ curso: await obtenerMiPropuestaCurso(param(req, 'id'), idDe(req)) })
})

propuestasRouter.delete('/me/propuestas/cursos/:id', exigirSesion, async (req, res) => {
  await eliminarCurso(param(req, 'id'), autor(idDe(req)))
  res.status(204).end()
})

propuestasRouter.post('/me/propuestas/cursos/:id/lecciones', exigirSesion, async (req, res) => {
  await agregarLeccion(param(req, 'id'), validarDatosLeccion(req.body, false), autor(idDe(req)))
  res.status(201).json({ curso: await obtenerMiPropuestaCurso(param(req, 'id'), idDe(req)) })
})

propuestasRouter.put(
  '/me/propuestas/cursos/:id/lecciones/orden',
  exigirSesion,
  async (req, res) => {
    await reordenarLecciones(param(req, 'id'), validarOrdenLecciones(req.body), autor(idDe(req)))
    res.status(200).json({ curso: await obtenerMiPropuestaCurso(param(req, 'id'), idDe(req)) })
  },
)

propuestasRouter.patch(
  '/me/propuestas/cursos/:id/lecciones/:idLeccion',
  exigirSesion,
  async (req, res) => {
    await actualizarLeccion(
      param(req, 'id'),
      param(req, 'idLeccion'),
      validarDatosLeccion(req.body, true),
      autor(idDe(req)),
    )
    res.status(200).json({ curso: await obtenerMiPropuestaCurso(param(req, 'id'), idDe(req)) })
  },
)

propuestasRouter.delete(
  '/me/propuestas/cursos/:id/lecciones/:idLeccion',
  exigirSesion,
  async (req, res) => {
    await eliminarLeccion(param(req, 'id'), param(req, 'idLeccion'), autor(idDe(req)))
    res.status(200).json({ curso: await obtenerMiPropuestaCurso(param(req, 'id'), idDe(req)) })
  },
)

// ---- Envío y avisos (recursos y cursos) ----

// POST /api/me/propuestas/:tipo/:id/envio: enviarla a revisión. Debe cumplir
// los mínimos de publicación; 409 limite_propuestas si ya hay tres en la cola.
propuestasRouter.post('/me/propuestas/:tipo/:id/envio', exigirSesion, async (req, res) => {
  const tipo = validarTipoContenido(req.params.tipo)
  await enviarARevision(tipo, param(req, 'id'), idDe(req))
  res.status(204).end()
})

// DELETE .../envio: cancelar el envío mientras nadie ha decidido.
propuestasRouter.delete('/me/propuestas/:tipo/:id/envio', exigirSesion, async (req, res) => {
  const tipo = validarTipoContenido(req.params.tipo)
  await cancelarEnvio(tipo, param(req, 'id'), idDe(req))
  res.status(204).end()
})

// PUT .../aviso-visto: ya vi la última decisión.
propuestasRouter.put('/me/propuestas/:tipo/:id/aviso-visto', exigirSesion, async (req, res) => {
  const tipo = validarTipoContenido(req.params.tipo)
  await marcarDecisionVista(tipo, param(req, 'id'), idDe(req))
  res.status(204).end()
})

// ---- Revisión (administrador) ----

// GET /api/admin/revisiones: la cola, lo enviado más antiguo primero.
adminRevisionesRouter.get('/revisiones', exigirAdministrador, async (_req, res) => {
  res.status(200).json({ propuestas: await listarCola() })
})

// GET /api/admin/revisiones/:tipo/:id: la propuesta completa y su historial.
adminRevisionesRouter.get('/revisiones/:tipo/:id', exigirAdministrador, async (req, res) => {
  const tipo = validarTipoContenido(req.params.tipo)
  res.status(200).json(await obtenerParaRevision(tipo, param(req, 'id')))
})

// POST /api/admin/revisiones/:tipo/:id/decision { decision, motivo, criterios }:
// aprobar, pedir cambios, rechazar, retirar o publicar de nuevo. 409
// revision_desactualizada si la propuesta cambió de estado mientras tanto.
adminRevisionesRouter.post(
  '/revisiones/:tipo/:id/decision',
  exigirAdministrador,
  async (req, res) => {
    const tipo = validarTipoContenido(req.params.tipo)
    const estatus = await decidir(tipo, param(req, 'id'), idDe(req), validarDecision(req.body))
    res.status(200).json({ estatus })
  },
)
