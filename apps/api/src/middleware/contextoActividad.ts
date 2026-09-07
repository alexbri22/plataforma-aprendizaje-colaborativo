import type { Membresia, PermisoCoorganizadorMembresia } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../data/prisma.js'
import { ErrorActividadNoEncontrada } from '../errores.js'
import type { UsuarioPublico } from '../services/cuentas/cuentas.service.js'

export interface ContextoActividad {
  actividad: NonNullable<Awaited<ReturnType<typeof prisma.actividad.findUnique>>>
  membresia: Membresia & { permisos: PermisoCoorganizadorMembresia[] }
}

declare module 'express-serve-static-core' {
  interface Request {
    contextoActividad?: ContextoActividad
  }
}

// Paso "Contexto de actividad" de la cadena de middleware
// (docs/diseno-desarrollo-nucleo.md §2.1): carga la actividad y la
// membresía del actor, con sus permisos concretos si es co-organizador.
// Toda ruta anidada bajo /actividades/{id} lo monta después de
// exigirSesion. No decide si la acción procede — eso es el servicio, con la
// función de autorización de capacidades.ts — solo deja el contexto listo.
//
// Un actor sin membresía no llega al servicio: responde 404 idéntico a una
// actividad inexistente (§3.3), para no revelar que la actividad existe a
// quien no es miembro.
//
// Sin try/catch propio: Express 5 reenvía a next() el rechazo de un
// middleware async (igual que el resto de rutas de este proyecto, ver
// routes/actividades.ts).
export async function cargarContextoActividad(req: Request, _res: Response, next: NextFunction) {
  const actor = req.actor as UsuarioPublico
  const idActividad = req.params.id as string

  const actividad = await prisma.actividad.findUnique({ where: { idActividad } })
  if (!actividad) {
    next(new ErrorActividadNoEncontrada())
    return
  }

  const membresia = await prisma.membresia.findUnique({
    where: { idActividad_idUsuario: { idActividad, idUsuario: actor.idUsuario } },
    include: { permisos: true },
  })
  if (!membresia) {
    next(new ErrorActividadNoEncontrada())
    return
  }

  req.contextoActividad = { actividad, membresia }
  next()
}
