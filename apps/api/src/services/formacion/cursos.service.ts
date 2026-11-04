import type { Prisma } from '@prisma/client'
import {
  ETIQUETAS_TIPO_LECCION,
  MAX_LECCIONES_CURSO,
  MIN_LECCIONES_CURSO,
  normalizarBusqueda,
  textoDeBusquedaCatalogo,
  type AreaHabilidad,
  type ElementoColaboracion,
  type EstatusCurso,
  type EstatusRecurso,
  type NivelCurso,
  type Paginacion,
  type TipoLeccion,
  type TipoRecurso,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorCursoConInscripciones,
  ErrorCursoDesactualizado,
  ErrorCursoNoEncontrado,
  ErrorLeccionNoEncontrada,
  ErrorRecursoNoEncontrado,
  ErrorValidacion,
} from '../../errores.js'
import { fijarFinalizaciones } from './calculoProgreso.js'
import type { DatosCurso, DatosLeccion, FiltrosCursos } from './cursos.validacion.js'
import { obtenerRecursoPublicado, type RecursoPublico } from './recursos.service.js'
import type { PeticionPagina } from './validacion.js'

/*
 * Cursos del Centro de formación (docs/diseno-desarrollo-formacion.md §2.4,
 * §5 y §9). Un curso es una secuencia ordenada de 2 a 5 lecciones; cada
 * lección reutiliza un recurso de la biblioteca o es contenido propio
 * (lectura, práctica o reflexión). Al final está lo público (catálogo, ficha y
 * lección): solo cursos publicados, sin sesión.
 *
 * Mismo ciclo editorial que los recursos: borrador → publicado → retirado →
 * publicado, sin volver a borrador. Un curso publicado debe seguir cumpliendo
 * los mínimos después de cualquier cambio en su ficha o en sus lecciones: si
 * un cambio los rompe, se rechaza completo (la transacción se deshace).
 */

export interface RecursoDeLeccion {
  idRecurso: string
  titulo: string
  tipoRecurso: TipoRecurso
  estatus: EstatusRecurso
  duracionMin: number | null
}

export interface LeccionAdmin {
  idLeccion: string
  orden: number
  /** En una lección de recurso puede venir vacío: se muestra el del recurso. */
  titulo: string
  tipo: TipoLeccion
  contenido: string
  obligatoria: boolean
  /** La que se capturó en la lección; null en una de recurso usa la del
   * recurso (ver duracionEfectivaMin). */
  duracionMin: number | null
  duracionEfectivaMin: number | null
  recurso: RecursoDeLeccion | null
}

export interface ResumenCursoAdmin {
  idCurso: string
  titulo: string
  resumen: string
  area: AreaHabilidad | null
  nivel: NivelCurso | null
  estatus: EstatusCurso
  orden: number
  numLecciones: number
  /** Suma de la duración de sus lecciones. */
  duracionMin: number
  fechaActualizacion: string
}

export interface CursoAdmin extends ResumenCursoAdmin {
  versionFicha: number
  objetivo: string
  elementos: ElementoColaboracion[]
  practicaFinal: string
  fechaCreacion: string
  autor: { idUsuario: string; nombre: string } | null
  lecciones: LeccionAdmin[]
}

export interface PaginaDeCursos {
  cursos: ResumenCursoAdmin[]
  paginacion: Paginacion
}

const INCLUIR_CURSO = {
  autor: { select: { idUsuario: true, nombre: true, apellidoPaterno: true } },
  lecciones: {
    orderBy: { orden: 'asc' },
    include: {
      recurso: {
        select: {
          idRecurso: true,
          titulo: true,
          tipoRecurso: true,
          estatus: true,
          duracionMin: true,
        },
      },
    },
  },
} satisfies Prisma.CursoInclude

// Dos lecturas más ligeras: el contenido de una lección llega a 20 000
// caracteres y son hasta 5 por curso, así que traerlo para un listado o para el
// índice sería leer millones de caracteres que se descartan.
const SELECT_RECURSO_DE_LECCION = {
  idRecurso: true,
  titulo: true,
  tipoRecurso: true,
  estatus: true,
  duracionMin: true,
} satisfies Prisma.RecursoFormativoSelect

/** Para los listados: solo lo que hace falta para contar y sumar la duración. */
const INCLUIR_RESUMEN = {
  lecciones: {
    select: { duracionMin: true, recurso: { select: { duracionMin: true } } },
  },
} satisfies Prisma.CursoInclude

/** Para la ficha pública y el visor: el índice, sin el contenido. */
const INCLUIR_INDICE = {
  autor: { select: { nombre: true, apellidoPaterno: true } },
  lecciones: {
    orderBy: { orden: 'asc' },
    omit: { contenido: true },
    include: { recurso: { select: SELECT_RECURSO_DE_LECCION } },
  },
} satisfies Prisma.CursoInclude

type FilaCurso = Prisma.CursoGetPayload<{ include: typeof INCLUIR_CURSO }>
type FilaLeccion = FilaCurso['lecciones'][number]
type FilaResumen = Prisma.CursoGetPayload<{ include: typeof INCLUIR_RESUMEN }>
type FilaIndice = Prisma.CursoGetPayload<{ include: typeof INCLUIR_INDICE }>
type LeccionDeIndice = FilaIndice['lecciones'][number]
type Cliente = Prisma.TransactionClient | typeof prisma

const ORDEN_CURSOS = [
  { orden: 'asc' },
  { fechaCreacion: 'asc' },
  { idCurso: 'asc' },
] satisfies Prisma.CursoOrderByWithRelationInput[]

function duracionDe(leccion: FilaResumen['lecciones'][number]): number | null {
  return leccion.duracionMin ?? leccion.recurso?.duracionMin ?? null
}

function aLeccion(fila: FilaLeccion): LeccionAdmin {
  return {
    idLeccion: fila.idLeccion,
    orden: fila.orden,
    titulo: fila.titulo,
    tipo: fila.tipo,
    contenido: fila.contenido,
    obligatoria: fila.obligatoria,
    duracionMin: fila.duracionMin,
    duracionEfectivaMin: duracionDe(fila),
    recurso: fila.recurso,
  }
}

function aResumen(fila: FilaResumen): ResumenCursoAdmin {
  return {
    idCurso: fila.idCurso,
    titulo: fila.titulo,
    resumen: fila.resumen,
    area: fila.area as AreaHabilidad | null,
    nivel: fila.nivel,
    estatus: fila.estatus,
    orden: fila.orden,
    numLecciones: fila.lecciones.length,
    duracionMin: fila.lecciones.reduce((total, l) => total + (duracionDe(l) ?? 0), 0),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  }
}

function aAdmin(fila: FilaCurso): CursoAdmin {
  return {
    ...aResumen(fila),
    versionFicha: fila.versionFicha,
    objetivo: fila.objetivo,
    elementos: fila.elementos as ElementoColaboracion[],
    practicaFinal: fila.practicaFinal,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    autor: fila.autor
      ? {
          idUsuario: fila.autor.idUsuario,
          nombre: `${fila.autor.nombre} ${fila.autor.apellidoPaterno}`,
        }
      : null,
    lecciones: fila.lecciones.map(aLeccion),
  }
}

/** Lo que guarda texto_busqueda, con la misma regla que en recursos. */
function textoDeBusqueda(
  c: Pick<DatosCurso, 'titulo' | 'resumen' | 'objetivo' | 'area' | 'elementos'>,
): string {
  return textoDeBusquedaCatalogo([c.titulo, c.resumen, c.objetivo], c.area, c.elementos)
}

async function leerCurso(cliente: Cliente, idCurso: string): Promise<FilaCurso> {
  const fila = await cliente.curso.findUnique({ where: { idCurso }, include: INCLUIR_CURSO })
  if (!fila) throw new ErrorCursoNoEncontrado()
  return fila
}

// ---- Reglas de publicación ----

type FichaCurso = Pick<
  DatosCurso,
  'resumen' | 'objetivo' | 'area' | 'elementos' | 'nivel' | 'practicaFinal'
>

/**
 * Mínimos de un curso publicado (§2.4 y §6.4): ficha completa; entre 2 y 5
 * lecciones con al menos una práctica y una reflexión; cada lección de
 * recurso apunta a un recurso publicado; cada lección propia tiene título,
 * contenido y duración. Los errores de una lección van en
 * `lecciones.<idLeccion>` para poder marcarla en el editor.
 *
 * `recursosAExigir` dice a qué lecciones se les pide un recurso publicado.
 * Al publicar, a todas. Al editar un curso ya publicado, solo a la lección
 * que se está tocando: retirar un recurso está permitido y deja esa lección
 * como "no disponible", y eso no debe impedir arreglar el curso ni editar lo
 * demás (si no, la única salida sería retirar el curso entero).
 */
function validarPublicable(
  ficha: FichaCurso,
  lecciones: FilaLeccion[],
  recursosAExigir: 'todos' | string[] = 'todos',
): void {
  const detalle: Record<string, string> = {}

  if (!ficha.resumen) detalle.resumen = 'Escribe un resumen antes de publicar.'
  if (!ficha.objetivo) detalle.objetivo = 'Escribe el objetivo antes de publicar.'
  if (!ficha.area) detalle.area = 'Elige el área de habilidad antes de publicar.'
  if (ficha.elementos.length === 0) {
    detalle.elementos = 'Relaciona al menos un elemento de colaboración.'
  }
  if (!ficha.nivel) detalle.nivel = 'Elige el nivel antes de publicar.'
  if (!ficha.practicaFinal) {
    detalle.practicaFinal = 'Describe el resultado práctico que obtendrá la persona.'
  }

  const faltas: string[] = []
  if (lecciones.length < MIN_LECCIONES_CURSO) {
    faltas.push(`al menos ${MIN_LECCIONES_CURSO} lecciones`)
  }
  for (const tipo of ['practica', 'reflexion'] as const) {
    if (!lecciones.some((l) => l.tipo === tipo)) {
      faltas.push(`una lección de ${ETIQUETAS_TIPO_LECCION[tipo].toLowerCase()}`)
    }
  }
  if (faltas.length > 0) detalle.lecciones = `El curso necesita ${faltas.join(', ')}.`

  for (const l of lecciones) {
    const clave = `lecciones.${l.idLeccion}`
    if (l.tipo === 'recurso') {
      const seExige = recursosAExigir === 'todos' || recursosAExigir.includes(l.idLeccion)
      if (seExige && l.recurso?.estatus !== 'publicado') {
        detalle[clave] = 'El recurso de esta lección no está publicado.'
      }
    } else if (!l.titulo || !l.contenido || l.duracionMin === null) {
      detalle[clave] = 'La lección necesita título, contenido y duración.'
    }
  }

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
}

function fichaDe(fila: FilaCurso): FichaCurso {
  return {
    resumen: fila.resumen,
    objetivo: fila.objetivo,
    area: fila.area as AreaHabilidad | null,
    elementos: fila.elementos as ElementoColaboracion[],
    nivel: fila.nivel,
    practicaFinal: fila.practicaFinal,
  }
}

/** Después de tocar las lecciones de un curso: si está publicado, debe
 * seguir siendo publicable (si no, lanza y la transacción se deshace). Además
 * marca el curso como actualizado y termina el curso de quien ya cumple con
 * las lecciones que quedan (quitar una lección o volverla opcional puede
 * dejar a alguien con todo hecho). */
async function cerrarCambioDeLecciones(
  tx: Prisma.TransactionClient,
  idCurso: string,
  leccionTocada?: string,
) {
  const curso = await tx.curso.update({
    where: { idCurso },
    data: { fechaActualizacion: new Date() },
    include: INCLUIR_CURSO,
  })
  if (curso.estatus === 'publicado') {
    validarPublicable(fichaDe(curso), curso.lecciones, leccionTocada ? [leccionTocada] : [])
  }
  await fijarFinalizaciones(tx, idCurso)
  return curso
}

/**
 * Toda modificación de un curso existente (ficha, estatus, lecciones) corre
 * en una transacción que primero bloquea su fila con SELECT … FOR UPDATE, por
 * la misma razón que en recursos: sin el bloqueo, dos peticiones simultáneas
 * validan cada una por su lado. Podrían dejar un curso publicado sin su
 * reflexión, pasar de 5 lecciones o chocar en la unicidad de (curso, orden).
 * Las peticiones sobre cursos distintos no se esperan entre sí.
 */
async function conCursoBloqueado<T>(
  idCurso: string,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const bloqueado = await tx.$queryRaw<{ id_curso: string }[]>`
      SELECT id_curso FROM cursos WHERE id_curso = ${idCurso} FOR UPDATE`
    if (bloqueado.length === 0) throw new ErrorCursoNoEncontrado()
    return operacion(tx)
  })
}

const TRANSICIONES: Readonly<Record<EstatusCurso, readonly EstatusCurso[]>> = {
  borrador: ['borrador', 'publicado'],
  publicado: ['publicado', 'retirado'],
  retirado: ['retirado', 'publicado'],
}

// ---- Cursos ----

export async function listarCursosAdmin({
  pagina,
  porPagina,
}: PeticionPagina): Promise<PaginaDeCursos> {
  const [total, filas] = await prisma.$transaction([
    prisma.curso.count(),
    prisma.curso.findMany({
      include: INCLUIR_RESUMEN,
      orderBy: ORDEN_CURSOS,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])
  return {
    cursos: filas.map(aResumen),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

export async function obtenerCursoAdmin(idCurso: string): Promise<CursoAdmin> {
  return aAdmin(await leerCurso(prisma, idCurso))
}

export async function crearCurso(
  idUsuarioAutor: string,
  datos: Partial<DatosCurso>,
): Promise<CursoAdmin> {
  const ficha = {
    titulo: datos.titulo ?? '',
    resumen: datos.resumen ?? '',
    objetivo: datos.objetivo ?? '',
    area: datos.area ?? null,
    elementos: datos.elementos ?? [],
    nivel: datos.nivel ?? null,
    practicaFinal: datos.practicaFinal ?? '',
  }
  // Un curso nuevo no tiene lecciones: pedir publicarlo en el alta siempre
  // falla con el mensaje de lo que falta.
  if (datos.estatus === 'publicado') validarPublicable(ficha, [])
  if (datos.estatus === 'retirado') {
    throw new ErrorValidacion({ estatus: 'Un curso nuevo nace como borrador.' })
  }

  const orden =
    datos.orden ?? ((await prisma.curso.aggregate({ _max: { orden: true } }))._max.orden ?? -1) + 1

  const fila = await prisma.curso.create({
    data: { ...ficha, orden, textoBusqueda: textoDeBusqueda(ficha), idUsuarioAutor },
    include: INCLUIR_CURSO,
  })
  return aAdmin(fila)
}

export async function actualizarCurso(
  idCurso: string,
  cambios: Partial<DatosCurso>,
  versionLeida?: number,
): Promise<CursoAdmin> {
  const fila = await conCursoBloqueado(idCurso, async (tx) => {
    const actual = await leerCurso(tx, idCurso)

    // Con la fila ya bloqueada: dos guardados simultáneos con la misma versión
    // no pueden pasar los dos.
    if (versionLeida !== undefined && versionLeida !== actual.versionFicha) {
      throw new ErrorCursoDesactualizado()
    }

    if (cambios.estatus && !TRANSICIONES[actual.estatus].includes(cambios.estatus)) {
      throw new ErrorValidacion({
        estatus:
          actual.estatus === 'borrador'
            ? 'Un borrador solo puede publicarse.'
            : 'Un curso publicado no vuelve a borrador; edítalo o retíralo.',
      })
    }

    const final = { titulo: actual.titulo, ...fichaDe(actual), ...cambios }
    if ((cambios.estatus ?? actual.estatus) === 'publicado') {
      // Pasar a publicado exige todo; editar uno que ya lo está, no los
      // recursos que se retiraron después (ver validarPublicable).
      validarPublicable(final, actual.lecciones, actual.estatus === 'publicado' ? [] : 'todos')
    }

    return tx.curso.update({
      where: { idCurso },
      data: {
        ...cambios,
        textoBusqueda: textoDeBusqueda(final),
        versionFicha: { increment: 1 },
      },
      include: INCLUIR_CURSO,
    })
  })
  return aAdmin(fila)
}

/** Borra el curso y sus lecciones. Los recursos que usaba no se tocan. Si
 * alguien ya lo empezó no se borra, para no perder su progreso: se retira.
 * El bloqueo del curso hace esperar a quien se inscribe en ese momento, y la
 * llave RESTRICT de inscripciones_curso cubre lo que quede. */
export async function eliminarCurso(idCurso: string): Promise<void> {
  await conCursoBloqueado(idCurso, async (tx) => {
    if ((await tx.inscripcionCurso.count({ where: { idCurso } })) > 0) {
      throw new ErrorCursoConInscripciones()
    }
    try {
      await tx.curso.delete({ where: { idCurso } })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2003') throw new ErrorCursoConInscripciones()
      throw error
    }
  })
}

// ---- Lecciones ----

type LeccionCombinada = Pick<DatosLeccion, 'tipo' | 'idRecurso' | 'titulo'>

/** Reglas de una lección que no dependen del estatus del curso: la de
 * recurso apunta a un recurso que existe; la propia no apunta a ninguno y
 * lleva título. */
async function validarLeccion(cliente: Cliente, l: LeccionCombinada): Promise<void> {
  if (l.tipo === 'recurso') {
    if (!l.idRecurso) {
      throw new ErrorValidacion({ idRecurso: 'Elige el recurso de la biblioteca.' })
    }
    const existe = await cliente.recursoFormativo.findUnique({
      where: { idRecurso: l.idRecurso },
      select: { idRecurso: true },
    })
    if (!existe) throw new ErrorRecursoNoEncontrado()
    return
  }
  const detalle: Record<string, string> = {}
  if (l.idRecurso) detalle.idRecurso = 'Solo una lección de recurso apunta a la biblioteca.'
  if (!l.titulo) detalle.titulo = 'La lección necesita un título.'
  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
}

/** Reasigna el orden 0..n-1 siguiendo `ids`. En dos pasos, pasando primero
 * por valores negativos, porque la unicidad (curso, orden) se comprueba fila
 * por fila y un intercambio directo chocaría a la mitad. */
async function renumerar(tx: Prisma.TransactionClient, ids: string[]) {
  for (const [i, idLeccion] of ids.entries()) {
    await tx.leccionCurso.update({ where: { idLeccion }, data: { orden: -(i + 1) } })
  }
  for (const [i, idLeccion] of ids.entries()) {
    await tx.leccionCurso.update({ where: { idLeccion }, data: { orden: i } })
  }
}

export async function agregarLeccion(
  idCurso: string,
  datos: Partial<DatosLeccion>,
): Promise<CursoAdmin> {
  const fila = await conCursoBloqueado(idCurso, async (tx) => {
    const curso = await leerCurso(tx, idCurso)
    if (curso.lecciones.length >= MAX_LECCIONES_CURSO) {
      throw new ErrorValidacion({
        lecciones: `Un curso tiene como máximo ${MAX_LECCIONES_CURSO} lecciones.`,
      })
    }

    const leccion = {
      tipo: datos.tipo as TipoLeccion,
      idRecurso: datos.idRecurso ?? null,
      titulo: datos.titulo ?? '',
    }
    await validarLeccion(tx, leccion)

    const { idLeccion } = await tx.leccionCurso.create({
      data: {
        idCurso,
        orden: curso.lecciones.length,
        tipo: leccion.tipo,
        idRecurso: leccion.idRecurso,
        titulo: leccion.titulo,
        contenido: datos.contenido ?? '',
        obligatoria: datos.obligatoria ?? true,
        duracionMin: datos.duracionMin ?? null,
      },
      select: { idLeccion: true },
    })
    return cerrarCambioDeLecciones(tx, idCurso, idLeccion)
  })
  return aAdmin(fila)
}

export async function actualizarLeccion(
  idCurso: string,
  idLeccion: string,
  cambios: Partial<DatosLeccion>,
): Promise<CursoAdmin> {
  const fila = await conCursoBloqueado(idCurso, async (tx) => {
    const actual = await tx.leccionCurso.findFirst({ where: { idLeccion, idCurso } })
    if (!actual) throw new ErrorLeccionNoEncontrada()

    const final = {
      tipo: cambios.tipo ?? actual.tipo,
      idRecurso: cambios.idRecurso !== undefined ? cambios.idRecurso : actual.idRecurso,
      titulo: cambios.titulo ?? actual.titulo,
    }
    // Al cambiar a una lección propia, el recurso deja de aplicar.
    if (cambios.tipo && cambios.tipo !== 'recurso' && cambios.idRecurso === undefined) {
      final.idRecurso = null
    }
    await validarLeccion(tx, final)

    await tx.leccionCurso.update({
      where: { idLeccion },
      data: { ...cambios, idRecurso: final.idRecurso },
    })
    return cerrarCambioDeLecciones(tx, idCurso, idLeccion)
  })
  return aAdmin(fila)
}

export async function eliminarLeccion(idCurso: string, idLeccion: string): Promise<CursoAdmin> {
  const fila = await conCursoBloqueado(idCurso, async (tx) => {
    const curso = await leerCurso(tx, idCurso)
    if (!curso.lecciones.some((l) => l.idLeccion === idLeccion)) {
      throw new ErrorLeccionNoEncontrada()
    }
    await tx.leccionCurso.delete({ where: { idLeccion } })
    await renumerar(
      tx,
      curso.lecciones.filter((l) => l.idLeccion !== idLeccion).map((l) => l.idLeccion),
    )
    return cerrarCambioDeLecciones(tx, idCurso)
  })
  return aAdmin(fila)
}

/** Reordena con la lista completa: debe traer exactamente las lecciones del
 * curso, cada una una vez. */
export async function reordenarLecciones(idCurso: string, ids: string[]): Promise<CursoAdmin> {
  const fila = await conCursoBloqueado(idCurso, async (tx) => {
    const curso = await leerCurso(tx, idCurso)
    const actuales = new Set(curso.lecciones.map((l) => l.idLeccion))
    if (ids.length !== actuales.size || !ids.every((id) => actuales.has(id))) {
      throw new ErrorValidacion({
        lecciones: 'La lista debe incluir exactamente las lecciones del curso.',
      })
    }
    await renumerar(tx, ids)
    return cerrarCambioDeLecciones(tx, idCurso)
  })
  return aAdmin(fila)
}

// ---- Público ----

export interface ResumenCursoPublico {
  idCurso: string
  titulo: string
  resumen: string
  area: AreaHabilidad | null
  nivel: NivelCurso | null
  elementos: ElementoColaboracion[]
  numLecciones: number
  duracionMin: number
  fechaActualizacion: string
}

export interface LeccionEnIndice {
  idLeccion: string
  orden: number
  titulo: string
  tipo: TipoLeccion
  obligatoria: boolean
  duracionMin: number | null
  /** False si su recurso ya no está publicado: la lección sigue en el índice
   * pero su contenido no se muestra. */
  disponible: boolean
  tipoRecurso: TipoRecurso | null
}

export interface CursoPublico extends ResumenCursoPublico {
  objetivo: string
  practicaFinal: string
  autor: string | null
  lecciones: LeccionEnIndice[]
}

export interface LeccionPublica extends LeccionEnIndice {
  contenido: string
  recurso: RecursoPublico | null
  anterior: { idLeccion: string; titulo: string } | null
  siguiente: { idLeccion: string; titulo: string } | null
}

export interface PaginaDeCursosPublicos {
  cursos: ResumenCursoPublico[]
  paginacion: Paginacion
}

function aIndice(fila: LeccionDeIndice): LeccionEnIndice {
  const disponible = fila.tipo !== 'recurso' || fila.recurso?.estatus === 'publicado'
  return {
    idLeccion: fila.idLeccion,
    orden: fila.orden,
    // El título de un recurso que no está publicado no se expone: podría ser
    // un borrador o algo que se retiró por un problema.
    titulo: fila.titulo || (disponible ? (fila.recurso?.titulo ?? '') : 'Recurso no disponible'),
    tipo: fila.tipo,
    obligatoria: fila.obligatoria,
    duracionMin: duracionDe(fila),
    disponible,
    tipoRecurso: disponible ? (fila.recurso?.tipoRecurso ?? null) : null,
  }
}

function aResumenPublico(fila: FilaResumen): ResumenCursoPublico {
  const { idCurso, titulo, resumen, area, nivel, numLecciones, duracionMin, fechaActualizacion } =
    aResumen(fila)
  return {
    idCurso,
    titulo,
    resumen,
    area,
    nivel,
    elementos: fila.elementos as ElementoColaboracion[],
    numLecciones,
    duracionMin,
    fechaActualizacion,
  }
}

export async function listarCursosPublicados(
  filtros: FiltrosCursos,
  { pagina, porPagina }: PeticionPagina,
): Promise<PaginaDeCursosPublicos> {
  const where: Prisma.CursoWhereInput = { estatus: 'publicado' }
  if (filtros.area) where.area = filtros.area
  if (filtros.nivel) where.nivel = filtros.nivel
  if (filtros.elemento) where.elementos = { has: filtros.elemento }
  if (filtros.texto) where.textoBusqueda = { contains: normalizarBusqueda(filtros.texto) }

  const [total, filas] = await prisma.$transaction([
    prisma.curso.count({ where }),
    prisma.curso.findMany({
      where,
      include: INCLUIR_RESUMEN,
      orderBy: ORDEN_CURSOS,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])
  return {
    cursos: filas.map(aResumenPublico),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

// Mismo 404 si el curso no existe que si no está publicado: un borrador no
// se distingue de un id inventado.
async function leerCursoPublicado(idCurso: string): Promise<FilaIndice> {
  const fila = await prisma.curso.findFirst({
    where: { idCurso, estatus: 'publicado' },
    include: INCLUIR_INDICE,
  })
  if (!fila) throw new ErrorCursoNoEncontrado()
  return fila
}

export async function obtenerCursoPublicado(idCurso: string): Promise<CursoPublico> {
  const fila = await leerCursoPublicado(idCurso)
  return {
    ...aResumenPublico(fila),
    objetivo: fila.objetivo,
    practicaFinal: fila.practicaFinal,
    autor: fila.autor ? `${fila.autor.nombre} ${fila.autor.apellidoPaterno}` : null,
    lecciones: fila.lecciones.map(aIndice),
  }
}

export async function obtenerLeccionPublica(
  idCurso: string,
  idLeccion: string,
): Promise<LeccionPublica> {
  const curso = await leerCursoPublicado(idCurso)
  const posicion = curso.lecciones.findIndex((l) => l.idLeccion === idLeccion)
  if (posicion === -1) throw new ErrorLeccionNoEncontrada()

  const fila = curso.lecciones[posicion]
  const indice = aIndice(fila)
  // El contenido se pide aparte y solo de esta lección.
  const { contenido } = await prisma.leccionCurso.findUniqueOrThrow({
    where: { idLeccion },
    select: { contenido: true },
  })
  const vecina = (l: LeccionDeIndice | undefined) =>
    l ? { idLeccion: l.idLeccion, titulo: aIndice(l).titulo } : null

  return {
    ...indice,
    contenido,
    recurso:
      indice.disponible && fila.idRecurso ? await obtenerRecursoPublicado(fila.idRecurso) : null,
    anterior: vecina(curso.lecciones[posicion - 1]),
    siguiente: vecina(curso.lecciones[posicion + 1]),
  }
}
