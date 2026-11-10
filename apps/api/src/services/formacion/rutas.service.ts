import type { Prisma } from '@prisma/client'
import {
  MIN_CURSOS_RUTA,
  textoDeBusquedaCatalogo,
  type ElementoColaboracion,
  type EstatusRecurso,
  type NivelCurso,
  type Paginacion,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorCursoNoEncontrado,
  ErrorRutaDesactualizada,
  ErrorRutaNoEncontrada,
  ErrorValidacion,
} from '../../errores.js'
import { INCLUIR_RESUMEN, aResumenPublico, type ResumenCursoPublico } from './cursos.service.js'
import type { DatosRuta } from './rutas.validacion.js'
import type { PeticionPagina } from './validacion.js'

/*
 * Rutas de aprendizaje (docs/diseno-desarrollo-formacion.md §4.1 y la nota
 * del incremento 4): una selección editorial ordenada de 2 a 5 cursos con una
 * misma finalidad. Solo el administrador las crea.
 *
 * Área, elementos, nivel y duración no se capturan: se calculan de los
 * cursos, para que la ruta nunca contradiga lo que contiene. El recomendador
 * usa esos mismos datos.
 *
 * Mismo ciclo editorial que cursos y recursos: borrador → publicado →
 * retirado → publicado. Publicar exige título, finalidad y de 2 a 5 cursos,
 * todos publicados. Un curso que se retira después no saca a la ruta del
 * catálogo: se muestra como no disponible, igual que una lección cuyo recurso
 * se retiró.
 */

export type EstatusRuta = EstatusRecurso

export interface CursoDeRuta extends ResumenCursoPublico {
  estatus: EstatusRecurso
  /** False si el curso ya no está publicado: sigue en la ruta pero no se abre. */
  disponible: boolean
}

/** Lo que se calcula de los cursos disponibles de la ruta. */
export interface DerivadoRuta {
  /** Elementos que trabaja, del más frecuente al menos, con cuántos cursos
   * lo trabajan. */
  elementos: { elemento: ElementoColaboracion; cursos: number }[]
  /** Nivel del primer curso disponible: donde empieza la ruta. */
  nivelInicial: NivelCurso | null
  duracionMin: number
  numCursos: number
}

export interface ResumenRutaAdmin {
  idRuta: string
  titulo: string
  finalidad: string
  estatus: EstatusRuta
  destacada: boolean
  orden: number
  numCursos: number
  fechaActualizacion: string
}

export interface RutaAdmin extends ResumenRutaAdmin {
  descripcion: string
  versionFicha: number
  fechaCreacion: string
  autor: { idUsuario: string; nombre: string } | null
  cursos: CursoDeRuta[]
  derivado: DerivadoRuta
}

export interface PaginaDeRutas {
  rutas: ResumenRutaAdmin[]
  paginacion: Paginacion
}

export const INCLUIR_CURSOS_DE_RUTA = {
  cursos: {
    orderBy: { orden: 'asc' },
    include: { curso: { include: INCLUIR_RESUMEN } },
  },
} satisfies Prisma.RutaFormativaInclude

const INCLUIR_RUTA = {
  ...INCLUIR_CURSOS_DE_RUTA,
  autor: { select: { idUsuario: true, nombre: true, apellidoPaterno: true } },
} satisfies Prisma.RutaFormativaInclude

type FilaRuta = Prisma.RutaFormativaGetPayload<{ include: typeof INCLUIR_RUTA }>
export type FilaCursosDeRuta = Prisma.RutaFormativaGetPayload<{
  include: typeof INCLUIR_CURSOS_DE_RUTA
}>

const ORDEN_RUTAS = [
  { orden: 'asc' },
  { fechaCreacion: 'asc' },
  { idRuta: 'asc' },
] satisfies Prisma.RutaFormativaOrderByWithRelationInput[]

const TRANSICIONES: Readonly<Record<EstatusRuta, readonly EstatusRuta[]>> = {
  borrador: ['borrador', 'publicado'],
  publicado: ['publicado', 'retirado'],
  retirado: ['retirado', 'publicado'],
}

// ---- Conversiones ----

export function cursosDeRuta(fila: FilaCursosDeRuta): CursoDeRuta[] {
  return fila.cursos.map(({ curso }) => ({
    ...aResumenPublico(curso),
    estatus: curso.estatus,
    disponible: curso.estatus === 'publicado',
  }))
}

export function derivarRuta(cursos: readonly CursoDeRuta[]): DerivadoRuta {
  const disponibles = cursos.filter((c) => c.disponible)
  const conteo = new Map<ElementoColaboracion, number>()
  for (const c of disponibles) {
    for (const e of c.elementos) conteo.set(e, (conteo.get(e) ?? 0) + 1)
  }
  return {
    elementos: [...conteo.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([elemento, n]) => ({ elemento, cursos: n })),
    nivelInicial: disponibles[0]?.nivel ?? null,
    duracionMin: disponibles.reduce((total, c) => total + c.duracionMin, 0),
    numCursos: cursos.length,
  }
}

function aResumen(fila: FilaRuta): ResumenRutaAdmin {
  return {
    idRuta: fila.idRuta,
    titulo: fila.titulo,
    finalidad: fila.finalidad,
    estatus: fila.estatus,
    destacada: fila.destacada,
    orden: fila.orden,
    numCursos: fila.cursos.length,
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  }
}

function aAdmin(fila: FilaRuta): RutaAdmin {
  const cursos = cursosDeRuta(fila)
  return {
    ...aResumen(fila),
    descripcion: fila.descripcion,
    versionFicha: fila.versionFicha,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    autor: fila.autor
      ? {
          idUsuario: fila.autor.idUsuario,
          nombre: `${fila.autor.nombre} ${fila.autor.apellidoPaterno}`,
        }
      : null,
    cursos,
    derivado: derivarRuta(cursos),
  }
}

function textoDeBusqueda(r: Pick<DatosRuta, 'titulo' | 'finalidad' | 'descripcion'>): string {
  return textoDeBusquedaCatalogo([r.titulo, r.finalidad, r.descripcion], null, [])
}

// ---- Reglas ----

/**
 * Mínimos de una ruta publicada: finalidad y de 2 a 5 cursos. `exigirPublicados`
 * dice a qué cursos se les pide estar publicados: al publicar, a todos; al
 * editar una ruta ya publicada, solo a los que se agregan, por la misma razón
 * que en cursos: un curso retirado después no debe impedir arreglar la ruta.
 */
function validarPublicable(
  ficha: Pick<DatosRuta, 'finalidad'>,
  cursos: { idCurso: string; titulo: string; estatus: EstatusRecurso }[],
  exigirPublicados: 'todos' | readonly string[],
): void {
  const detalle: Record<string, string> = {}
  if (!ficha.finalidad) detalle.finalidad = 'Escribe para qué sirve la ruta antes de publicarla.'
  if (cursos.length < MIN_CURSOS_RUTA) {
    detalle.cursos = `Una ruta publicada necesita al menos ${MIN_CURSOS_RUTA} cursos.`
  }
  const sinPublicar = cursos.filter(
    (c) =>
      c.estatus !== 'publicado' &&
      (exigirPublicados === 'todos' || exigirPublicados.includes(c.idCurso)),
  )
  if (sinPublicar.length > 0) {
    detalle.cursos = `Estos cursos no están publicados: ${sinPublicar
      .map((c) => `«${c.titulo}»`)
      .join(', ')}.`
  }
  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
}

/**
 * Toda modificación de una ruta corre en una transacción que bloquea su fila
 * (FOR UPDATE), como en cursos y recursos: dos guardados simultáneos no se
 * validan cada uno por su lado.
 */
async function conRutaBloqueada<T>(
  idRuta: string,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const bloqueada = await tx.$queryRaw<{ id_ruta: string }[]>`
      SELECT id_ruta FROM rutas_formativas WHERE id_ruta = ${idRuta} FOR UPDATE`
    if (bloqueada.length === 0) throw new ErrorRutaNoEncontrada()
    return operacion(tx)
  })
}

/**
 * Lee los cursos de la lista bloqueándolos en modo compartido (FOR SHARE):
 * mientras dura la transacción nadie los borra ni les cambia el estatus. Sin
 * esto, un curso que el administrador elimina a la vez pasaba la comprobación
 * y la inserción chocaba con la llave foránea (500); y publicar la ruta podía
 * validar contra un estatus que estaba cambiando.
 */
async function bloquearCursos(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
): Promise<Map<string, { idCurso: string; titulo: string; estatus: EstatusRecurso }>> {
  if (ids.length === 0) return new Map()
  const filas = await tx.$queryRaw<{ id_curso: string; titulo: string; estatus: EstatusRecurso }[]>`
    SELECT id_curso, titulo, estatus::text AS estatus FROM cursos
    WHERE id_curso = ANY(${ids}::text[])
    FOR SHARE`
  return new Map(
    filas.map((f) => [f.id_curso, { idCurso: f.id_curso, titulo: f.titulo, estatus: f.estatus }]),
  )
}

/** A lo más una ruta destacada. El candado consultivo forma en fila a quienes
 * marcan una ruta como destacada: sin él, dos administradores que marcan
 * rutas distintas a la vez desmarcan cada uno las demás sin ver la del otro,
 * y quedan dos. */
async function hacerDestacada(tx: Prisma.TransactionClient, idRuta: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rutas_formativas.destacada'))`
  await tx.rutaFormativa.updateMany({
    where: { destacada: true, idRuta: { not: idRuta } },
    // Desmarcarla cambia su ficha: sube la versión para que un editor que la
    // tenía abierta reciba ruta_desactualizada y no la vuelva a marcar sin
    // saberlo.
    data: { destacada: false, versionFicha: { increment: 1 } },
  })
}

async function leerRuta(cliente: Prisma.TransactionClient | typeof prisma, idRuta: string) {
  const fila = await cliente.rutaFormativa.findUnique({ where: { idRuta }, include: INCLUIR_RUTA })
  if (!fila) throw new ErrorRutaNoEncontrada()
  return fila
}

// ---- Administración ----

export async function listarRutasAdmin({
  pagina,
  porPagina,
}: PeticionPagina): Promise<PaginaDeRutas> {
  const [total, filas] = await prisma.$transaction([
    prisma.rutaFormativa.count(),
    prisma.rutaFormativa.findMany({
      include: INCLUIR_RUTA,
      orderBy: ORDEN_RUTAS,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])
  return {
    rutas: filas.map(aResumen),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

export async function obtenerRutaAdmin(idRuta: string): Promise<RutaAdmin> {
  return aAdmin(await leerRuta(prisma, idRuta))
}

/** Alta de la ficha: nace en borrador, sin cursos y al final del orden. */
export async function crearRuta(idAutor: string, datos: Partial<DatosRuta>): Promise<RutaAdmin> {
  if (datos.estatus && datos.estatus !== 'borrador') {
    throw new ErrorValidacion({
      estatus: 'Una ruta nace en borrador; agrégale cursos y publícala.',
    })
  }
  const fila = await prisma.$transaction(async (tx) => {
    const ultimo = await tx.rutaFormativa.aggregate({ _max: { orden: true } })
    const final = {
      titulo: datos.titulo as string,
      finalidad: datos.finalidad ?? '',
      descripcion: datos.descripcion ?? '',
    }
    const creada = await tx.rutaFormativa.create({
      data: {
        ...final,
        orden: datos.orden ?? (ultimo._max.orden ?? -1) + 1,
        destacada: datos.destacada ?? false,
        textoBusqueda: textoDeBusqueda(final),
        idUsuarioAutor: idAutor,
      },
      select: { idRuta: true },
    })
    if (datos.destacada) await hacerDestacada(tx, creada.idRuta)
    return leerRuta(tx, creada.idRuta)
  })
  return aAdmin(fila)
}

/** Editar la ficha, publicar, retirar o marcar como destacada. */
export async function actualizarRuta(
  idRuta: string,
  cambios: Partial<DatosRuta>,
  versionLeida?: number,
): Promise<RutaAdmin> {
  const fila = await conRutaBloqueada(idRuta, async (tx) => {
    const actual = await leerRuta(tx, idRuta)
    if (versionLeida !== undefined && versionLeida !== actual.versionFicha) {
      throw new ErrorRutaDesactualizada()
    }
    if (cambios.estatus && !TRANSICIONES[actual.estatus].includes(cambios.estatus)) {
      throw new ErrorValidacion({
        estatus:
          actual.estatus === 'borrador'
            ? 'Un borrador solo puede publicarse.'
            : 'Una ruta publicada no vuelve a borrador; edítala o retírala.',
      })
    }

    const final = {
      titulo: cambios.titulo ?? actual.titulo,
      finalidad: cambios.finalidad ?? actual.finalidad,
      descripcion: cambios.descripcion ?? actual.descripcion,
    }
    if ((cambios.estatus ?? actual.estatus) === 'publicado') {
      const ids = actual.cursos.map((c) => c.idCurso)
      const bloqueados = await bloquearCursos(tx, ids)
      validarPublicable(
        final,
        ids.flatMap((id) => bloqueados.get(id) ?? []),
        actual.estatus === 'publicado' ? [] : 'todos',
      )
    }

    // Solo si deja de no serlo. El editor manda destacada: true en cada
    // guardado de la ruta destacada; pedir el candado aquí, con la fila ya
    // bloqueada, invierte el orden de quien marca otra ruta (candado y luego
    // filas) y los dos se esperan.
    if (cambios.destacada && !actual.destacada) await hacerDestacada(tx, idRuta)
    await tx.rutaFormativa.update({
      where: { idRuta },
      data: {
        ...cambios,
        textoBusqueda: textoDeBusqueda(final),
        versionFicha: { increment: 1 },
      },
    })
    return leerRuta(tx, idRuta)
  })
  return aAdmin(fila)
}

/**
 * Reemplaza la lista de cursos de la ruta, en el orden dado. Es una sola
 * operación (y no agregar, quitar y reordenar por separado) porque el editor
 * arma la lista completa; también mueve la versión de la ficha, porque
 * reescribe lo que otro administrador pudo haber cambiado.
 */
export async function reemplazarCursosRuta(
  idRuta: string,
  ids: string[],
  versionLeida?: number,
): Promise<RutaAdmin> {
  const fila = await conRutaBloqueada(idRuta, async (tx) => {
    const actual = await leerRuta(tx, idRuta)
    if (versionLeida !== undefined && versionLeida !== actual.versionFicha) {
      throw new ErrorRutaDesactualizada()
    }

    const bloqueados = await bloquearCursos(tx, ids)
    if (ids.some((id) => !bloqueados.has(id))) throw new ErrorCursoNoEncontrado()

    if (actual.estatus === 'publicado') {
      const antes = new Set(actual.cursos.map((c) => c.idCurso))
      validarPublicable(
        actual,
        ids.map(
          (id) =>
            bloqueados.get(id) as { idCurso: string; titulo: string; estatus: EstatusRecurso },
        ),
        ids.filter((id) => !antes.has(id)),
      )
    }

    await tx.cursoRuta.deleteMany({ where: { idRuta } })
    await tx.cursoRuta.createMany({
      data: ids.map((idCurso, orden) => ({ idRuta, idCurso, orden })),
    })
    await tx.rutaFormativa.update({
      where: { idRuta },
      data: { versionFicha: { increment: 1 }, fechaActualizacion: new Date() },
    })
    return leerRuta(tx, idRuta)
  })
  return aAdmin(fila)
}

/** Borra la ruta y su lista; los cursos no se tocan. Como el progreso de una
 * ruta se calcula de sus cursos, borrarla no borra el avance de nadie. */
export async function eliminarRuta(idRuta: string): Promise<void> {
  const { count } = await prisma.rutaFormativa.deleteMany({ where: { idRuta } })
  if (count === 0) throw new ErrorRutaNoEncontrada()
}

// ---- Público ----

/** Un curso dentro de una ruta, visto por el público. El título de un curso
 * que ya no está publicado no se expone: podría haberse retirado por un
 * problema (mismo criterio que una lección cuyo recurso se retiró). */
export interface CursoDeRutaPublico {
  idCurso: string
  titulo: string
  nivel: NivelCurso | null
  duracionMin: number
  disponible: boolean
}

export interface ResumenRutaPublica {
  idRuta: string
  titulo: string
  finalidad: string
  destacada: boolean
  derivado: DerivadoRuta
  cursos: CursoDeRutaPublico[]
}

export interface RutaPublica extends ResumenRutaPublica {
  descripcion: string
}

export interface PaginaDeRutasPublicas {
  rutas: ResumenRutaPublica[]
  paginacion: Paginacion
}

function aCursoPublico(c: CursoDeRuta): CursoDeRutaPublico {
  return {
    idCurso: c.idCurso,
    titulo: c.disponible ? c.titulo : 'Curso no disponible',
    nivel: c.disponible ? c.nivel : null,
    duracionMin: c.disponible ? c.duracionMin : 0,
    disponible: c.disponible,
  }
}

function aResumenRutaPublica(
  fila: FilaCursosDeRuta & {
    titulo: string
    finalidad: string
    destacada: boolean
    idRuta: string
  },
): ResumenRutaPublica {
  const cursos = cursosDeRuta(fila)
  return {
    idRuta: fila.idRuta,
    titulo: fila.titulo,
    finalidad: fila.finalidad,
    destacada: fila.destacada,
    derivado: derivarRuta(cursos),
    cursos: cursos.map(aCursoPublico),
  }
}

/** Catálogo de rutas publicadas, la destacada primero y luego en su orden. */
export async function listarRutasPublicadas({
  pagina,
  porPagina,
}: PeticionPagina): Promise<PaginaDeRutasPublicas> {
  const where = { estatus: 'publicado' } satisfies Prisma.RutaFormativaWhereInput
  const [total, filas] = await prisma.$transaction([
    prisma.rutaFormativa.count({ where }),
    prisma.rutaFormativa.findMany({
      where,
      include: INCLUIR_CURSOS_DE_RUTA,
      orderBy: [{ destacada: 'desc' }, ...ORDEN_RUTAS],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])
  return {
    rutas: filas.map(aResumenRutaPublica),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

/** Ficha pública. Lo que no está publicado responde 404, igual que un id
 * inexistente. */
export async function obtenerRutaPublicada(idRuta: string): Promise<RutaPublica> {
  const fila = await prisma.rutaFormativa.findFirst({
    where: { idRuta, estatus: 'publicado' },
    include: INCLUIR_CURSOS_DE_RUTA,
  })
  if (!fila) throw new ErrorRutaNoEncontrada()
  return { ...aResumenRutaPublica(fila), descripcion: fila.descripcion }
}
