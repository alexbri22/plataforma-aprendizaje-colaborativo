import type { Prisma } from '@prisma/client'
import type { TipoLeccion } from '@plataforma/shared'

/*
 * Cálculo del progreso de una persona en un curso
 * (docs/diseno-desarrollo-formacion.md, nota del incremento 3). Vive aparte
 * porque lo usan el servicio del alumno y los del administrador (cursos y
 * recursos), y así ninguno importa al otro.
 *
 * No hay versiones de curso: el progreso se guarda por lección y el
 * porcentaje se calcula siempre con las lecciones actuales. Una lección cuenta
 * para terminar si es obligatoria y está disponible (su recurso, si lo usa,
 * sigue publicado); si el curso no tiene ninguna obligatoria disponible,
 * cuentan todas las disponibles, para que nadie lo termine sin hacer nada.
 */

export interface LeccionParaProgreso {
  idLeccion: string
  orden: number
  titulo: string
  tipo: TipoLeccion
  obligatoria: boolean
  recurso: { titulo: string; estatus: string } | null
}

export const SELECT_LECCION_PARA_PROGRESO = {
  idLeccion: true,
  orden: true,
  titulo: true,
  tipo: true,
  obligatoria: true,
  recurso: { select: { titulo: true, estatus: true } },
} satisfies Prisma.LeccionCursoSelect

export interface ProgresoCalculado {
  /** Lecciones que cuentan para terminar el curso. */
  total: number
  /** De esas, cuántas están completadas. */
  completadas: number
  /** De 0 a 100, redondeado hacia abajo: 100 solo cuando están todas. */
  porcentaje: number
  /** Todas las que cuentan están completadas. */
  completo: boolean
  /** Primera lección disponible sin completar, en orden. */
  siguiente: { idLeccion: string; titulo: string } | null
}

export function leccionDisponible(l: Pick<LeccionParaProgreso, 'tipo' | 'recurso'>): boolean {
  return l.tipo !== 'recurso' || l.recurso?.estatus === 'publicado'
}

export function calcularProgreso(
  lecciones: readonly LeccionParaProgreso[],
  completadas: ReadonlySet<string>,
): ProgresoCalculado {
  const enOrden = [...lecciones].sort((a, b) => a.orden - b.orden)
  const disponibles = enOrden.filter(leccionDisponible)
  const obligatorias = disponibles.filter((l) => l.obligatoria)
  const cuentan = obligatorias.length > 0 ? obligatorias : disponibles

  const hechas = cuentan.filter((l) => completadas.has(l.idLeccion)).length
  const pendiente = disponibles.find((l) => !completadas.has(l.idLeccion))
  return {
    total: cuentan.length,
    completadas: hechas,
    porcentaje: cuentan.length === 0 ? 0 : Math.floor((hechas * 100) / cuentan.length),
    completo: cuentan.length > 0 && hechas === cuentan.length,
    siguiente: pendiente
      ? {
          idLeccion: pendiente.idLeccion,
          titulo: pendiente.titulo || pendiente.recurso?.titulo || '',
        }
      : null,
  }
}

/**
 * Fija la finalización de las inscripciones abiertas de un curso que ya
 * cumplen. Se llama después de que el administrador cambia lo que cuenta
 * (quitar una lección, volverla opcional, retirar un recurso): quien ya tenía
 * hechas todas las demás termina el curso en ese momento.
 *
 * Primero bloquea esas inscripciones (FOR UPDATE), igual que lo hace quien
 * marca una lección. Si alguien está marcando a la vez, esta lectura espera a
 * que termine y ve su progreso; sin el bloqueo, cada lado podía creer que al
 * otro le faltaba algo y nadie fijaba la fecha.
 */
export async function fijarFinalizaciones(
  tx: Prisma.TransactionClient,
  idCurso: string,
): Promise<void> {
  const abiertas = await tx.$queryRaw<{ id_inscripcion: string }[]>`
    SELECT id_inscripcion FROM inscripciones_curso
    WHERE id_curso = ${idCurso} AND fecha_finalizacion IS NULL
    FOR UPDATE`
  if (abiertas.length === 0) return

  const lecciones = await tx.leccionCurso.findMany({
    where: { idCurso },
    select: SELECT_LECCION_PARA_PROGRESO,
  })
  const progresos = await tx.progresoLeccion.findMany({
    where: { idInscripcion: { in: abiertas.map((a) => a.id_inscripcion) } },
    select: { idInscripcion: true, idLeccion: true },
  })

  const porInscripcion = new Map<string, Set<string>>()
  for (const p of progresos) {
    const set = porInscripcion.get(p.idInscripcion) ?? new Set<string>()
    set.add(p.idLeccion)
    porInscripcion.set(p.idInscripcion, set)
  }
  const cumplidas = abiertas
    .map((a) => a.id_inscripcion)
    .filter((id) => calcularProgreso(lecciones, porInscripcion.get(id) ?? new Set()).completo)
  if (cumplidas.length === 0) return

  await tx.inscripcionCurso.updateMany({
    where: { idInscripcion: { in: cumplidas }, fechaFinalizacion: null },
    data: { fechaFinalizacion: new Date() },
  })
}
