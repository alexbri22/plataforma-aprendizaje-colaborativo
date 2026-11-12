import type { Prisma } from '@prisma/client'
import type { EstatusCurso } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'

/** Cursos (sin repetir) que usan un recurso en alguna lección. Vive aparte
 * porque lo consume recursos.service, que a su vez usa cursos.service, y así
 * no hay importación circular. */
export async function cursosQueUsanRecurso(
  idRecurso: string,
  cliente: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ idCurso: string; titulo: string; estatus: EstatusCurso }[]> {
  return cliente.curso.findMany({
    where: { lecciones: { some: { idRecurso } } },
    select: { idCurso: true, titulo: true, estatus: true },
    orderBy: { titulo: 'asc' },
  })
}

/** Rutas (sin repetir) que incluyen un curso, para explicar por qué no se
 * puede eliminar. Vive aquí por la misma razón: rutas.service usa
 * cursos.service. */
export async function rutasQueUsanCurso(
  idCurso: string,
  cliente: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ idRuta: string; titulo: string }[]> {
  return cliente.rutaFormativa.findMany({
    where: { cursos: { some: { idCurso } } },
    select: { idRuta: true, titulo: true },
    orderBy: { titulo: 'asc' },
  })
}
