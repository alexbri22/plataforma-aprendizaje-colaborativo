import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../data/prisma.js'
import {
  ErrorCursoNoEncontrado,
  ErrorLeccionNoDisponible,
  ErrorLeccionNoEncontrada,
  ErrorValidacion,
} from '../../errores.js'
import {
  SELECT_LECCION_PARA_PROGRESO,
  calcularProgreso,
  leccionDisponible,
  type LeccionParaProgreso,
} from './calculoProgreso.js'

/*
 * Progreso personal en los cursos (docs/diseno-desarrollo-formacion.md §7.2,
 * §9.1 y la nota del incremento 3). Todo exige sesión y todo es de la propia
 * persona: ninguna función recibe el id de otra.
 *
 * - Tocar un curso publicado con sesión (empezarlo, marcar una lección,
 *   escribir una reflexión) crea su inscripción, o recupera la que ya existe.
 * - La finalización se fija la primera vez que están todas las lecciones que
 *   cuentan (ver calculoProgreso.ts) y no se borra después: ni al desmarcar
 *   una lección ni si el administrador agrega otra.
 * - Nada de esto califica ni genera señales de desempeño; Insignias puede
 *   leer cursosCompletadosDe si algún día lo necesita.
 */

export interface ReflexionPropia {
  idLeccion: string
  texto: string
  fechaActualizacion: string
}

export interface MiProgresoCurso {
  idCurso: string
  inscrito: boolean
  fechaInicio: string | null
  fechaFinalizacion: string | null
  /** Ids de las lecciones que la persona marcó como completadas. */
  leccionesCompletadas: string[]
  total: number
  completadas: number
  porcentaje: number
  siguiente: { idLeccion: string; titulo: string } | null
  reflexiones: ReflexionPropia[]
}

export interface ResultadoMarcar {
  progreso: MiProgresoCurso
  /** True solo en la petición que terminó el curso, para avisarlo una vez. */
  cursoCompletadoAhora: boolean
}

export interface MiCurso {
  idCurso: string
  titulo: string
  /** Un curso retirado sigue en la lista de quien lo empezó, sin "Seguir". */
  estatus: 'publicado' | 'retirado'
  fechaInicio: string
  fechaFinalizacion: string | null
  fechaUltimaActividad: string
  total: number
  completadas: number
  porcentaje: number
  siguiente: { idLeccion: string; titulo: string } | null
}

export interface MiFormacion {
  /** Sin terminar, el más reciente primero: el primero es el que muestra
   * "Continúa aprendiendo". */
  enCurso: MiCurso[]
  /** Terminados, el más reciente primero. */
  completados: MiCurso[]
}

const INCLUIR_INSCRIPCION = {
  progresos: { select: { idLeccion: true } },
  reflexiones: { select: { idLeccion: true, texto: true, fechaActualizacion: true } },
} satisfies Prisma.InscripcionCursoInclude

type FilaInscripcion = Prisma.InscripcionCursoGetPayload<{ include: typeof INCLUIR_INSCRIPCION }>

function aMiProgreso(
  idCurso: string,
  lecciones: LeccionParaProgreso[],
  inscripcion: FilaInscripcion | null,
): MiProgresoCurso {
  const completadas = new Set(inscripcion?.progresos.map((p) => p.idLeccion) ?? [])
  const calculo = calcularProgreso(lecciones, completadas)
  return {
    idCurso,
    inscrito: inscripcion !== null,
    fechaInicio: inscripcion?.fechaInicio.toISOString() ?? null,
    fechaFinalizacion: inscripcion?.fechaFinalizacion?.toISOString() ?? null,
    leccionesCompletadas: lecciones
      .filter((l) => completadas.has(l.idLeccion))
      .sort((a, b) => a.orden - b.orden)
      .map((l) => l.idLeccion),
    total: calculo.total,
    completadas: calculo.completadas,
    porcentaje: calculo.porcentaje,
    siguiente: calculo.siguiente,
    reflexiones: (inscripcion?.reflexiones ?? []).map((r) => ({
      idLeccion: r.idLeccion,
      texto: r.texto,
      fechaActualizacion: r.fechaActualizacion.toISOString(),
    })),
  }
}

/**
 * Corre una operación sobre la inscripción de la persona en un curso
 * publicado, creándola si no existe. Orden de bloqueos, siempre el mismo para
 * no entrar en un abrazo mortal con el administrador:
 *
 * 1. El curso, compartido (FOR SHARE): varias personas avanzan a la vez, pero
 *    un cambio del administrador sobre el curso (que lo bloquea FOR UPDATE)
 *    espera a que terminen, y al revés.
 * 2. La inscripción, exclusiva (FOR UPDATE): dos pestañas de la misma persona
 *    se forman. Sin esto, marcar a la vez las dos últimas lecciones hacía que
 *    cada petición viera a la otra sin terminar y el curso nunca se cerraba.
 */
async function conInscripcion<T>(
  idUsuario: string,
  idCurso: string,
  operacion: (
    tx: Prisma.TransactionClient,
    idInscripcion: string,
    lecciones: LeccionParaProgreso[],
  ) => Promise<T>,
): Promise<{ creada: boolean; resultado: T }> {
  return prisma.$transaction(async (tx) => {
    const curso = await tx.$queryRaw<{ id_curso: string }[]>`
      SELECT id_curso FROM cursos
      WHERE id_curso = ${idCurso} AND estatus = 'publicado'
      FOR SHARE`
    if (curso.length === 0) throw new ErrorCursoNoEncontrado()

    // ON CONFLICT: dos peticiones que inscriben a la vez no chocan en la
    // unicidad (usuario, curso); la segunda simplemente no inserta.
    const insertadas = await tx.$executeRaw`
      INSERT INTO inscripciones_curso (id_inscripcion, id_usuario, id_curso)
      VALUES (${randomUUID()}, ${idUsuario}, ${idCurso})
      ON CONFLICT (id_usuario, id_curso) DO NOTHING`
    const [{ id_inscripcion: idInscripcion }] = await tx.$queryRaw<{ id_inscripcion: string }[]>`
      SELECT id_inscripcion FROM inscripciones_curso
      WHERE id_usuario = ${idUsuario} AND id_curso = ${idCurso}
      FOR UPDATE`

    const lecciones = await tx.leccionCurso.findMany({
      where: { idCurso },
      select: SELECT_LECCION_PARA_PROGRESO,
      orderBy: { orden: 'asc' },
    })
    const resultado = await operacion(tx, idInscripcion, lecciones)
    return { creada: insertadas === 1, resultado }
  })
}

async function leerProgreso(
  tx: Prisma.TransactionClient,
  idCurso: string,
  idInscripcion: string,
  lecciones: LeccionParaProgreso[],
): Promise<MiProgresoCurso> {
  const inscripcion = await tx.inscripcionCurso.findUniqueOrThrow({
    where: { idInscripcion },
    include: INCLUIR_INSCRIPCION,
  })
  return aMiProgreso(idCurso, lecciones, inscripcion)
}

function leccionDelCurso(lecciones: LeccionParaProgreso[], idLeccion: string): LeccionParaProgreso {
  const leccion = lecciones.find((l) => l.idLeccion === idLeccion)
  if (!leccion) throw new ErrorLeccionNoEncontrada()
  return leccion
}

/** Empezar un curso: crea la inscripción o devuelve la que ya existe. */
export async function inscribirse(
  idUsuario: string,
  idCurso: string,
): Promise<{ creada: boolean; progreso: MiProgresoCurso }> {
  const { creada, resultado } = await conInscripcion(
    idUsuario,
    idCurso,
    async (tx, idInscripcion, lecciones) => {
      await tx.inscripcionCurso.update({
        where: { idInscripcion },
        data: { fechaUltimaActividad: new Date() },
      })
      return leerProgreso(tx, idCurso, idInscripcion, lecciones)
    },
  )
  return { creada, progreso: resultado }
}

/** Marca o desmarca una lección. Marcar dos veces no duplica nada, y
 * desmarcar no quita la finalización ya fijada. */
export async function marcarLeccion(
  idUsuario: string,
  idCurso: string,
  idLeccion: string,
  completada: boolean,
): Promise<ResultadoMarcar> {
  const { resultado } = await conInscripcion(
    idUsuario,
    idCurso,
    async (tx, idInscripcion, lecciones) => {
      const leccion = leccionDelCurso(lecciones, idLeccion)
      if (completada) {
        if (!leccionDisponible(leccion)) throw new ErrorLeccionNoDisponible()
        await tx.progresoLeccion.createMany({
          data: [{ idInscripcion, idLeccion }],
          skipDuplicates: true,
        })
      } else {
        await tx.progresoLeccion.deleteMany({ where: { idInscripcion, idLeccion } })
      }

      const antes = await tx.inscripcionCurso.findUniqueOrThrow({
        where: { idInscripcion },
        select: { fechaFinalizacion: true },
      })
      const progreso = await leerProgreso(tx, idCurso, idInscripcion, lecciones)
      const terminaAhora =
        antes.fechaFinalizacion === null &&
        progreso.total > 0 &&
        progreso.completadas === progreso.total
      const ahora = new Date()
      await tx.inscripcionCurso.update({
        where: { idInscripcion },
        data: {
          fechaUltimaActividad: ahora,
          ...(terminaAhora ? { fechaFinalizacion: ahora } : {}),
        },
      })
      return {
        progreso: terminaAhora ? { ...progreso, fechaFinalizacion: ahora.toISOString() } : progreso,
        cursoCompletadoAhora: terminaAhora,
      }
    },
  )
  return resultado
}

/** Guarda la respuesta privada a una lección de reflexión. Un texto vacío la
 * borra. Escribirla no marca la lección: la reflexión es opcional y nunca se
 * califica. */
export async function guardarReflexion(
  idUsuario: string,
  idCurso: string,
  idLeccion: string,
  texto: string,
): Promise<ReflexionPropia | null> {
  const { resultado } = await conInscripcion(
    idUsuario,
    idCurso,
    async (tx, idInscripcion, lecciones) => {
      const leccion = leccionDelCurso(lecciones, idLeccion)
      if (leccion.tipo !== 'reflexion') {
        throw new ErrorValidacion({
          texto: 'Solo las lecciones de reflexión guardan una respuesta.',
        })
      }
      await tx.inscripcionCurso.update({
        where: { idInscripcion },
        data: { fechaUltimaActividad: new Date() },
      })
      if (texto === '') {
        await tx.reflexionFormativa.deleteMany({ where: { idInscripcion, idLeccion } })
        return null
      }
      const fila = await tx.reflexionFormativa.upsert({
        where: { idInscripcion_idLeccion: { idInscripcion, idLeccion } },
        create: { idInscripcion, idLeccion, texto },
        update: { texto },
      })
      return {
        idLeccion,
        texto: fila.texto,
        fechaActualizacion: fila.fechaActualizacion.toISOString(),
      }
    },
  )
  return resultado
}

/** Mi progreso en un curso publicado. Si todavía no lo empecé, responde sin
 * inscripción y en cero: solo leer no crea nada. */
export async function obtenerMiProgreso(
  idUsuario: string,
  idCurso: string,
): Promise<MiProgresoCurso> {
  const curso = await prisma.curso.findFirst({
    where: { idCurso, estatus: 'publicado' },
    select: {
      lecciones: { select: SELECT_LECCION_PARA_PROGRESO, orderBy: { orden: 'asc' } },
      inscripciones: { where: { idUsuario }, include: INCLUIR_INSCRIPCION },
    },
  })
  if (!curso) throw new ErrorCursoNoEncontrado()
  return aMiProgreso(idCurso, curso.lecciones, curso.inscripciones[0] ?? null)
}

/** Mis cursos: los que empecé, en curso y terminados. Incluye los retirados
 * (sin siguiente lección, porque ya no se abren); los borradores no pueden
 * tener inscripciones, porque un curso publicado no vuelve a borrador. */
export async function obtenerMiFormacion(idUsuario: string): Promise<MiFormacion> {
  const filas = await prisma.inscripcionCurso.findMany({
    where: { idUsuario, curso: { estatus: { in: ['publicado', 'retirado'] } } },
    include: {
      progresos: { select: { idLeccion: true } },
      curso: {
        select: {
          titulo: true,
          estatus: true,
          lecciones: { select: SELECT_LECCION_PARA_PROGRESO },
        },
      },
    },
    orderBy: [{ fechaUltimaActividad: 'desc' }, { idInscripcion: 'asc' }],
  })

  const cursos = filas.map((f): MiCurso => {
    const calculo = calcularProgreso(
      f.curso.lecciones,
      new Set(f.progresos.map((p) => p.idLeccion)),
    )
    const publicado = f.curso.estatus === 'publicado'
    return {
      idCurso: f.idCurso,
      titulo: f.curso.titulo,
      estatus: publicado ? 'publicado' : 'retirado',
      fechaInicio: f.fechaInicio.toISOString(),
      fechaFinalizacion: f.fechaFinalizacion?.toISOString() ?? null,
      fechaUltimaActividad: f.fechaUltimaActividad.toISOString(),
      total: calculo.total,
      completadas: calculo.completadas,
      porcentaje: calculo.porcentaje,
      siguiente: publicado ? calculo.siguiente : null,
    }
  })
  return {
    enCurso: cursos.filter((c) => c.fechaFinalizacion === null),
    completados: cursos
      .filter((c) => c.fechaFinalizacion !== null)
      .sort((a, b) => (b.fechaFinalizacion as string).localeCompare(a.fechaFinalizacion as string)),
  }
}

/**
 * Contrato de lectura para Insignias (Persona C, §1.2 y B6 de §11.2): qué
 * cursos terminó una persona y cuándo. Formación no emite eventos ni crea
 * señales; si el módulo de insignias decide usar la finalización, la consulta
 * por aquí, sin leer estas tablas directamente (documento general §3.4).
 */
export async function cursosCompletadosDe(
  idUsuario: string,
): Promise<{ idCurso: string; titulo: string; fechaFinalizacion: string }[]> {
  const filas = await prisma.inscripcionCurso.findMany({
    where: { idUsuario, fechaFinalizacion: { not: null } },
    select: { idCurso: true, fechaFinalizacion: true, curso: { select: { titulo: true } } },
    orderBy: { fechaFinalizacion: 'desc' },
  })
  return filas.map((f) => ({
    idCurso: f.idCurso,
    titulo: f.curso.titulo,
    fechaFinalizacion: (f.fechaFinalizacion as Date).toISOString(),
  }))
}
