import {
  MAX_ELEMENTOS_PREFERIDOS,
  esElementoColaboracion,
  type ElementoColaboracion,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorValidacion } from '../../errores.js'
import {
  recomendarRutas,
  type PerfilFormativo,
  type Recomendacion,
  type ResultadoRecomendacion,
} from './recomendacion.js'
import {
  INCLUIR_CURSOS_DE_RUTA,
  cursosDeRuta,
  derivarRuta,
  type CursoDeRuta,
  type DerivadoRuta,
} from './rutas.service.js'

/*
 * Lado de base de datos del recomendador: junta el perfil formativo de la
 * persona y las rutas publicadas y se los pasa a recomendarRutas, que es una
 * función pura (recomendacion.ts). Solo lee datos de Formación de la propia
 * persona: preferencias e inscripciones. Nada de otros módulos.
 */

export interface Preferencias {
  elementos: ElementoColaboracion[]
}

export interface RutaRecomendada extends Recomendacion {
  ruta: {
    idRuta: string
    titulo: string
    finalidad: string
    destacada: boolean
    derivado: DerivadoRuta
    cursos: (Pick<CursoDeRuta, 'idCurso' | 'titulo' | 'nivel' | 'duracionMin' | 'disponible'> & {
      /** El avance de la persona en ese curso. */
      estado: 'pendiente' | 'en_curso' | 'completado'
    })[]
  }
}

export interface Recomendaciones {
  modo: ResultadoRecomendacion['modo']
  recomendaciones: RutaRecomendada[]
}

export function validarPreferencias(cuerpo: unknown): ElementoColaboracion[] {
  const { elementos } = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<
    string,
    unknown
  >
  if (
    !Array.isArray(elementos) ||
    !elementos.every((e) => typeof e === 'string' && esElementoColaboracion(e))
  ) {
    throw new ErrorValidacion({ elementos: 'Elige elementos de colaboración válidos.' })
  }
  const unicos = [...new Set(elementos as ElementoColaboracion[])]
  if (unicos.length > MAX_ELEMENTOS_PREFERIDOS) {
    throw new ErrorValidacion({
      elementos: `Elige como máximo ${MAX_ELEMENTOS_PREFERIDOS} elementos.`,
    })
  }
  return unicos
}

export async function obtenerPreferencias(idUsuario: string): Promise<Preferencias> {
  const fila = await prisma.preferenciasFormativas.findUnique({ where: { idUsuario } })
  return { elementos: (fila?.elementos ?? []) as ElementoColaboracion[] }
}

/** Reemplaza lo que la persona quiere fortalecer. Una lista vacía borra la
 * preferencia: el recomendador vuelve a usar solo sus cursos. */
export async function guardarPreferencias(
  idUsuario: string,
  elementos: ElementoColaboracion[],
): Promise<Preferencias> {
  const fila = await prisma.preferenciasFormativas.upsert({
    where: { idUsuario },
    create: { idUsuario, elementos },
    update: { elementos },
  })
  return { elementos: fila.elementos as ElementoColaboracion[] }
}

async function leerPerfil(idUsuario: string): Promise<PerfilFormativo> {
  const [preferencias, inscripciones] = await Promise.all([
    obtenerPreferencias(idUsuario),
    prisma.inscripcionCurso.findMany({
      where: { idUsuario },
      select: {
        idCurso: true,
        fechaFinalizacion: true,
        curso: { select: { elementos: true, nivel: true } },
      },
    }),
  ])
  return {
    preferidos: preferencias.elementos,
    // También los cursos que se retiraron después: lo aprendido cuenta.
    cursos: inscripciones.map((i) => ({
      idCurso: i.idCurso,
      estado: i.fechaFinalizacion ? 'completado' : 'en_curso',
      elementos: i.curso.elementos as ElementoColaboracion[],
      nivel: i.curso.nivel,
    })),
  }
}

/** Las rutas publicadas que más le convienen a la persona, con sus razones. */
export async function obtenerRecomendaciones(
  idUsuario: string,
  limite: number,
): Promise<Recomendaciones> {
  const [perfil, filas] = await Promise.all([
    leerPerfil(idUsuario),
    prisma.rutaFormativa.findMany({
      where: { estatus: 'publicado' },
      include: INCLUIR_CURSOS_DE_RUTA,
    }),
  ])

  const rutas = new Map(
    filas.map((f) => {
      const cursos = cursosDeRuta(f)
      return [f.idRuta, { fila: f, cursos }] as const
    }),
  )
  const resultado = recomendarRutas(
    perfil,
    [...rutas.values()].map(({ fila, cursos }) => ({
      idRuta: fila.idRuta,
      destacada: fila.destacada,
      orden: fila.orden,
      cursos,
    })),
  )

  const estado = new Map(perfil.cursos.map((c) => [c.idCurso, c.estado]))
  return {
    modo: resultado.modo,
    recomendaciones: resultado.recomendaciones.slice(0, limite).map((r) => {
      const { fila, cursos } = rutas.get(r.idRuta) as NonNullable<ReturnType<typeof rutas.get>>
      return {
        ...r,
        ruta: {
          idRuta: fila.idRuta,
          titulo: fila.titulo,
          finalidad: fila.finalidad,
          destacada: fila.destacada,
          derivado: derivarRuta(cursos),
          cursos: cursos.map((c) => ({
            idCurso: c.idCurso,
            // Mismo cuidado que el catálogo público (aCursoPublico): el título
            // de un curso retirado no se expone.
            titulo: c.disponible ? c.titulo : 'Curso no disponible',
            nivel: c.disponible ? c.nivel : null,
            duracionMin: c.disponible ? c.duracionMin : 0,
            disponible: c.disponible,
            estado: estado.get(c.idCurso) ?? 'pendiente',
          })),
        },
      }
    }),
  }
}
