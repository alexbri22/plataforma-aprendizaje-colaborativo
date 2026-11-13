import { Router } from 'express'
import { LARGO_MAXIMO_REFLEXION, POR_PAGINA_PUBLICA } from '@plataforma/shared'
import { ErrorValidacion } from '../errores.js'
import { exigirSesion } from '../middleware/sesion.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'
import {
  guardarReflexion,
  inscribirse,
  marcarLeccion,
  obtenerMiFormacion,
  obtenerMiProgreso,
} from '../services/formacion/progreso.service.js'
import {
  estaGuardado,
  guardarRecurso,
  listarRecursosGuardados,
  quitarRecursoGuardado,
} from '../services/formacion/recursos.service.js'
import {
  guardarPreferencias,
  obtenerPreferencias,
  obtenerRecomendaciones,
  validarPreferencias,
} from '../services/formacion/recomendacion.service.js'
import { validarPaginacion } from '../services/formacion/validacion.js'

// Progreso personal y biblioteca personal (docs/diseno-desarrollo-formacion.md
// §7.2, §8 y la nota del incremento 3). Leer cursos y recursos sigue siendo
// libre; todo lo de aquí exige sesión y solo toca lo de quien llama: ninguna
// ruta recibe el id de otra persona.
export const progresoRouter = Router()

function idDe(req: { actor?: UsuarioPublico }): string {
  return (req.actor as UsuarioPublico).idUsuario
}

function validarTextoReflexion(cuerpo: unknown): string {
  const texto = (cuerpo as Record<string, unknown> | undefined)?.texto
  if (typeof texto !== 'string') {
    throw new ErrorValidacion({ texto: 'Escribe tu reflexión como texto.' })
  }
  const limpio = texto.trim()
  if (limpio.length > LARGO_MAXIMO_REFLEXION) {
    throw new ErrorValidacion({
      texto: `La reflexión admite hasta ${LARGO_MAXIMO_REFLEXION} caracteres.`,
    })
  }
  return limpio
}

// POST /api/cursos/:id/inscripcion: empezar el curso. 201 si se creó, 200 si
// ya existía.
progresoRouter.post('/cursos/:id/inscripcion', exigirSesion, async (req, res) => {
  const { creada, progreso } = await inscribirse(idDe(req), req.params.id as string)
  res.status(creada ? 201 : 200).json({ progreso })
})

// PUT y DELETE /api/cursos/:id/lecciones/:idLeccion/completada: marcar o
// desmarcar la lección. Los dos son idempotentes.
progresoRouter.put(
  '/cursos/:id/lecciones/:idLeccion/completada',
  exigirSesion,
  async (req, res) => {
    const resultado = await marcarLeccion(
      idDe(req),
      req.params.id as string,
      req.params.idLeccion as string,
      true,
    )
    res.status(200).json(resultado)
  },
)

progresoRouter.delete(
  '/cursos/:id/lecciones/:idLeccion/completada',
  exigirSesion,
  async (req, res) => {
    const resultado = await marcarLeccion(
      idDe(req),
      req.params.id as string,
      req.params.idLeccion as string,
      false,
    )
    res.status(200).json(resultado)
  },
)

// PUT /api/cursos/:id/lecciones/:idLeccion/reflexion { texto }: guarda la
// respuesta privada; un texto vacío la borra.
progresoRouter.put('/cursos/:id/lecciones/:idLeccion/reflexion', exigirSesion, async (req, res) => {
  const reflexion = await guardarReflexion(
    idDe(req),
    req.params.id as string,
    req.params.idLeccion as string,
    validarTextoReflexion(req.body),
  )
  res.status(200).json({ reflexion })
})

// GET /api/me/formacion: mis cursos, en curso y terminados.
progresoRouter.get('/me/formacion', exigirSesion, async (req, res) => {
  res.status(200).json(await obtenerMiFormacion(idDe(req)))
})

// GET /api/me/cursos/:id: mi progreso en un curso publicado, con mis
// reflexiones. Sin inscripción responde en cero; leer no inscribe.
progresoRouter.get('/me/cursos/:id', exigirSesion, async (req, res) => {
  res.status(200).json({ progreso: await obtenerMiProgreso(idDe(req), req.params.id as string) })
})

// GET /api/me/recursos-guardados?pagina&porPagina: mi biblioteca personal.
progresoRouter.get('/me/recursos-guardados', exigirSesion, async (req, res) => {
  const pagina = validarPaginacion(req.query as Record<string, unknown>, POR_PAGINA_PUBLICA)
  res.status(200).json(await listarRecursosGuardados(idDe(req), pagina))
})

// GET /api/me/recursos-guardados/:id: { guardado } para el botón del recurso.
progresoRouter.get('/me/recursos-guardados/:id', exigirSesion, async (req, res) => {
  res.status(200).json({ guardado: await estaGuardado(idDe(req), req.params.id as string) })
})

progresoRouter.put('/me/recursos-guardados/:id', exigirSesion, async (req, res) => {
  await guardarRecurso(idDe(req), req.params.id as string)
  res.status(204).end()
})

progresoRouter.delete('/me/recursos-guardados/:id', exigirSesion, async (req, res) => {
  await quitarRecursoGuardado(idDe(req), req.params.id as string)
  res.status(204).end()
})

// GET y PUT /api/me/preferencias-formativas { elementos }: lo que la persona
// quiere fortalecer (hasta dos elementos). Privado; solo lo usa el
// recomendador.
progresoRouter.get('/me/preferencias-formativas', exigirSesion, async (req, res) => {
  res.status(200).json({ preferencias: await obtenerPreferencias(idDe(req)) })
})

progresoRouter.put('/me/preferencias-formativas', exigirSesion, async (req, res) => {
  const preferencias = await guardarPreferencias(idDe(req), validarPreferencias(req.body))
  res.status(200).json({ preferencias })
})

const LIMITE_RECOMENDACIONES = { porDefecto: 3, maximo: 10 }

// GET /api/me/rutas/recomendadas?limite: las rutas que más le convienen, con
// su puntaje, sus señales y las razones (docs/diseno-desarrollo-formacion.md,
// nota del incremento 4).
progresoRouter.get('/me/rutas/recomendadas', exigirSesion, async (req, res) => {
  const crudo = req.query.limite
  let limite = LIMITE_RECOMENDACIONES.porDefecto
  if (crudo !== undefined) {
    const n = Number(crudo)
    if (!Number.isInteger(n) || n < 1 || n > LIMITE_RECOMENDACIONES.maximo) {
      throw new ErrorValidacion({
        limite: `El límite debe ser un entero entre 1 y ${LIMITE_RECOMENDACIONES.maximo}.`,
      })
    }
    limite = n
  }
  res.status(200).json(await obtenerRecomendaciones(idDe(req), limite))
})
