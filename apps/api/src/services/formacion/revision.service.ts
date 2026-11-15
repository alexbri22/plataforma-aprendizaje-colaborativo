import type { Prisma } from '@prisma/client'
import {
  ESTATUS_EDITABLES_POR_AUTOR,
  MAX_PROPUESTAS_ABIERTAS,
  MAX_PROPUESTAS_EN_REVISION,
  type AccionRevision,
  type CriterioPublicacion,
  type DecisionRevision,
  type EstatusRecurso,
  type OrigenContenido,
  type TipoContenido,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorCursoNoEncontrado,
  ErrorLimitePropuestas,
  ErrorPropuestaNoEditable,
  ErrorRecursoNoEncontrado,
  ErrorRevisionDesactualizada,
} from '../../errores.js'
import { nombreCompletoDe } from '../cuentas/cuentas.service.js'
import { ADMIN, autor, motivoNoEditable } from './acceso.js'
import {
  alCambiarEstatusCurso,
  bloquearRecursosDeLecciones,
  crearCurso,
  obtenerCursoAdmin,
  validarCursoPublicable,
  type CursoAdmin,
} from './cursos.service.js'
import type { DatosCurso } from './cursos.validacion.js'
import {
  alCambiarEstatusRecurso,
  crearRecurso,
  obtenerRecursoAdmin,
  validarRecursoPublicable,
  type RecursoAdminDetalle,
} from './recursos.service.js'
import type { DecisionValidada } from './revision.validacion.js'
import type { DatosRecurso } from './validacion.js'

/*
 * Autoría abierta con revisión (docs/diseno-desarrollo-formacion.md §6.3, §9.2,
 * §12.3, MOD-01 y nota del incremento 6).
 *
 * Una persona propone un recurso o un curso: nace en borrador, solo suyo. Lo
 * envía a revisión y queda congelado. El administrador lo aprueba (se
 * publica), pide cambios (vuelve a su autor con el motivo) o lo rechaza (es
 * definitivo). Una propuesta publicada puede retirarse, también con motivo.
 * Cada envío y cada decisión quedan en revisiones_contenido.
 *
 * Concurrencia: todo bloquea la fila del contenido (FOR UPDATE), igual que
 * las ediciones, así que un envío, una cancelación, una decisión y una
 * edición de la misma propuesta se forman en fila y cada una ve el estado que
 * dejó la anterior. Los límites por persona se cuentan con un candado
 * consultivo por autor, tomado después del de la fila: sin él, dos envíos
 * simultáneos cuentan cada uno sin ver al otro y pasan el límite.
 */

interface FilaEstado {
  origen: OrigenContenido
  estatus: EstatusRecurso
  idUsuarioAutor: string | null
  titulo: string
}

function noEncontrado(tipo: TipoContenido): Error {
  return tipo === 'recurso' ? new ErrorRecursoNoEncontrado() : new ErrorCursoNoEncontrado()
}

/** Bloquea la fila del contenido y devuelve su estado, o null si no existe. */
async function bloquearContenido(
  tx: Prisma.TransactionClient,
  tipo: TipoContenido,
  id: string,
): Promise<FilaEstado | null> {
  type Cruda = {
    origen: OrigenContenido
    estatus: EstatusRecurso
    id_usuario_autor: string | null
    titulo: string
  }
  const filas =
    tipo === 'recurso'
      ? await tx.$queryRaw<Cruda[]>`
          SELECT origen::text AS origen, estatus::text AS estatus, id_usuario_autor, titulo
          FROM recursos_formativos WHERE id_recurso = ${id} FOR UPDATE`
      : await tx.$queryRaw<Cruda[]>`
          SELECT origen::text AS origen, estatus::text AS estatus, id_usuario_autor, titulo
          FROM cursos WHERE id_curso = ${id} FOR UPDATE`
  const f = filas[0]
  return f
    ? { origen: f.origen, estatus: f.estatus, idUsuarioAutor: f.id_usuario_autor, titulo: f.titulo }
    : null
}

/** Forma en fila lo que cuenta las propuestas de una persona. */
async function bloquearAutor(tx: Prisma.TransactionClient, idUsuario: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`propuestas:${idUsuario}`}))`
}

async function contarPropuestas(
  tx: Prisma.TransactionClient,
  idUsuario: string,
  estatus: readonly EstatusRecurso[],
): Promise<number> {
  const where = {
    idUsuarioAutor: idUsuario,
    origen: 'propuesta' as const,
    estatus: { in: [...estatus] },
  }
  return (await tx.recursoFormativo.count({ where })) + (await tx.curso.count({ where }))
}

interface CambioDeEstado {
  estatus: EstatusRecurso
  fechaEnvio?: Date | null
  decisionSinVer?: boolean
}

async function cambiarEstado(
  tx: Prisma.TransactionClient,
  tipo: TipoContenido,
  id: string,
  cambio: CambioDeEstado,
): Promise<void> {
  // La versión sube para que un editor abierto con la versión anterior no
  // guarde encima de un estado que ya no es el que leyó.
  const data = { ...cambio, versionFicha: { increment: 1 } }
  if (tipo === 'recurso') await tx.recursoFormativo.update({ where: { idRecurso: id }, data })
  else await tx.curso.update({ where: { idCurso: id }, data })
}

async function registrar(
  tx: Prisma.TransactionClient,
  r: {
    tipo: TipoContenido
    id: string
    titulo: string
    actor: string
    accion: AccionRevision
    motivo?: string
    criterios?: CriterioPublicacion[]
  },
): Promise<void> {
  await tx.revisionContenido.create({
    data: {
      tipoContenido: r.tipo,
      idContenido: r.id,
      titulo: r.titulo,
      idUsuarioActor: r.actor,
      accion: r.accion,
      motivo: r.motivo ?? '',
      criterios: r.criterios ?? [],
    },
  })
}

// ---- Historial ----

export interface EntradaHistorial {
  accion: AccionRevision
  motivo: string
  criterios: CriterioPublicacion[]
  fecha: string
  /** Solo para el administrador: quién lo hizo. */
  actor?: string | null
}

const ACCIONES_DE_DECISION: AccionRevision[] = [
  'aprobada',
  'cambios_solicitados',
  'rechazada',
  'retirada',
  'publicada_de_nuevo',
]

/** Envíos y decisiones, del más antiguo al más reciente. El autor no ve qué
 * administrador decidió: ve la decisión y su motivo. */
export async function historialDe(
  tipo: TipoContenido,
  id: string,
  { conActor }: { conActor: boolean },
): Promise<EntradaHistorial[]> {
  const filas = await prisma.revisionContenido.findMany({
    where: { tipoContenido: tipo, idContenido: id },
    orderBy: [{ fecha: 'asc' }, { idRevision: 'asc' }],
  })
  const nombres = new Map<string, string | null>()
  if (conActor) {
    for (const idActor of new Set(filas.map((f) => f.idUsuarioActor).filter(Boolean))) {
      nombres.set(idActor as string, await nombreCompletoDe(idActor as string))
    }
  }
  return filas.map((f) => ({
    accion: f.accion,
    motivo: f.motivo,
    criterios: f.criterios as CriterioPublicacion[],
    fecha: f.fecha.toISOString(),
    ...(conActor
      ? { actor: f.idUsuarioActor ? (nombres.get(f.idUsuarioActor) ?? null) : null }
      : {}),
  }))
}

// ---- Lo que ve el autor ----

export interface UltimaDecision {
  accion: AccionRevision
  motivo: string
  fecha: string
}

export interface PropuestaResumen {
  tipo: TipoContenido
  id: string
  titulo: string
  estatus: EstatusRecurso
  fechaActualizacion: string
  fechaEnvio: string | null
  /** Una decisión que todavía no ha visto. */
  decisionSinVer: boolean
  ultimaDecision: UltimaDecision | null
}

export interface MisPropuestas {
  propuestas: PropuestaResumen[]
  avisosPendientes: number
}

/** Mis propuestas, la que se tocó más recientemente primero, con la última
 * decisión de cada una. */
export async function listarMisPropuestas(idUsuario: string): Promise<MisPropuestas> {
  const where = { idUsuarioAutor: idUsuario, origen: 'propuesta' as const }
  const select = {
    titulo: true,
    estatus: true,
    fechaActualizacion: true,
    fechaEnvio: true,
    decisionSinVer: true,
  } as const
  const [recursos, cursos] = await Promise.all([
    prisma.recursoFormativo.findMany({ where, select: { idRecurso: true, ...select } }),
    prisma.curso.findMany({ where, select: { idCurso: true, ...select } }),
  ])
  const filas = [
    ...recursos.map(({ idRecurso, ...r }) => ({ tipo: 'recurso' as const, id: idRecurso, ...r })),
    ...cursos.map(({ idCurso, ...c }) => ({ tipo: 'curso' as const, id: idCurso, ...c })),
  ]

  const decisiones = await prisma.revisionContenido.findMany({
    where: { idContenido: { in: filas.map((f) => f.id) }, accion: { in: ACCIONES_DE_DECISION } },
    orderBy: [{ fecha: 'desc' }, { idRevision: 'desc' }],
  })
  const ultima = new Map<string, UltimaDecision>()
  for (const d of decisiones) {
    const clave = `${d.tipoContenido}:${d.idContenido}`
    if (!ultima.has(clave)) {
      ultima.set(clave, { accion: d.accion, motivo: d.motivo, fecha: d.fecha.toISOString() })
    }
  }

  const propuestas = filas
    .map((f): PropuestaResumen => ({
      tipo: f.tipo,
      id: f.id,
      titulo: f.titulo,
      estatus: f.estatus,
      fechaActualizacion: f.fechaActualizacion.toISOString(),
      fechaEnvio: f.fechaEnvio?.toISOString() ?? null,
      decisionSinVer: f.decisionSinVer,
      ultimaDecision: ultima.get(`${f.tipo}:${f.id}`) ?? null,
    }))
    .sort((a, b) => b.fechaActualizacion.localeCompare(a.fechaActualizacion))
  return { propuestas, avisosPendientes: propuestas.filter((p) => p.decisionSinVer).length }
}

/** Cuántas decisiones no ha visto: el punto de "Mi formación". */
export async function contarAvisosPendientes(idUsuario: string): Promise<number> {
  const where = { idUsuarioAutor: idUsuario, origen: 'propuesta' as const, decisionSinVer: true }
  return (await prisma.recursoFormativo.count({ where })) + (await prisma.curso.count({ where }))
}

/** La persona ya vio la última decisión sobre su propuesta. Es una sola
 * escritura sobre su fila y repetirla no cambia nada. */
export async function marcarDecisionVista(
  tipo: TipoContenido,
  id: string,
  idUsuario: string,
): Promise<void> {
  const where = { idUsuarioAutor: idUsuario, origen: 'propuesta' as const }
  const { count } =
    tipo === 'recurso'
      ? await prisma.recursoFormativo.updateMany({
          where: { ...where, idRecurso: id },
          data: { decisionSinVer: false },
        })
      : await prisma.curso.updateMany({
          where: { ...where, idCurso: id },
          data: { decisionSinVer: false },
        })
  if (count === 0) throw noEncontrado(tipo)
}

export interface EstadoRevision {
  fechaEnvio: string | null
  decisionSinVer: boolean
  historial: EntradaHistorial[]
}

async function estadoRevision(tipo: TipoContenido, id: string): Promise<EstadoRevision> {
  const select = { fechaEnvio: true, decisionSinVer: true } as const
  const fila =
    tipo === 'recurso'
      ? await prisma.recursoFormativo.findUniqueOrThrow({ where: { idRecurso: id }, select })
      : await prisma.curso.findUniqueOrThrow({ where: { idCurso: id }, select })
  return {
    fechaEnvio: fila.fechaEnvio?.toISOString() ?? null,
    decisionSinVer: fila.decisionSinVer,
    historial: await historialDe(tipo, id, { conActor: false }),
  }
}

export type PropuestaRecurso = RecursoAdminDetalle & { revision: EstadoRevision }
export type PropuestaCurso = CursoAdmin & { revision: EstadoRevision }

/** Mi propuesta en su editor, con su historial de revisión. 404 si no es
 * mía. */
export async function obtenerMiPropuestaRecurso(
  id: string,
  idUsuario: string,
): Promise<PropuestaRecurso> {
  const recurso = await obtenerRecursoAdmin(id, autor(idUsuario))
  return { ...recurso, revision: await estadoRevision('recurso', id) }
}

export async function obtenerMiPropuestaCurso(
  id: string,
  idUsuario: string,
): Promise<PropuestaCurso> {
  const curso = await obtenerCursoAdmin(id, autor(idUsuario))
  return { ...curso, revision: await estadoRevision('curso', id) }
}

/** Una propuesta nueva, en borrador. Con el límite de propuestas abiertas
 * contado bajo el candado de la persona. */
export async function crearPropuestaRecurso(
  idUsuario: string,
  datos: Partial<DatosRecurso>,
): Promise<PropuestaRecurso> {
  const creado = await prisma.$transaction(async (tx) => {
    await exigirCupoAbierto(tx, idUsuario)
    return crearRecurso(idUsuario, datos, { origen: 'propuesta', cliente: tx })
  })
  return obtenerMiPropuestaRecurso(creado.idRecurso, idUsuario)
}

export async function crearPropuestaCurso(
  idUsuario: string,
  datos: Partial<DatosCurso>,
): Promise<PropuestaCurso> {
  const creado = await prisma.$transaction(async (tx) => {
    await exigirCupoAbierto(tx, idUsuario)
    return crearCurso(idUsuario, datos, { origen: 'propuesta', cliente: tx })
  })
  return obtenerMiPropuestaCurso(creado.idCurso, idUsuario)
}

async function exigirCupoAbierto(tx: Prisma.TransactionClient, idUsuario: string): Promise<void> {
  await bloquearAutor(tx, idUsuario)
  if (
    (await contarPropuestas(tx, idUsuario, ESTATUS_EDITABLES_POR_AUTOR)) >= MAX_PROPUESTAS_ABIERTAS
  ) {
    throw new ErrorLimitePropuestas(
      `Ya tienes ${MAX_PROPUESTAS_ABIERTAS} propuestas en preparación. Envía o elimina alguna antes de empezar otra.`,
    )
  }
}

/** Enviar mi propuesta a revisión: debe cumplir los mínimos de publicación,
 * y no puedo tener más de MAX_PROPUESTAS_EN_REVISION en la cola. */
export async function enviarARevision(
  tipo: TipoContenido,
  id: string,
  idUsuario: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const fila = await bloquearContenido(tx, tipo, id)
    if (!fila || fila.origen !== 'propuesta' || fila.idUsuarioAutor !== idUsuario) {
      throw noEncontrado(tipo)
    }
    if (fila.estatus === 'en_revision') {
      throw new ErrorRevisionDesactualizada('Tu propuesta ya está en revisión.')
    }
    const motivo = motivoNoEditable(fila, autor(idUsuario))
    if (motivo) throw new ErrorPropuestaNoEditable(motivo)

    if (tipo === 'recurso') await validarRecursoPublicable(tx, id)
    else await validarCursoPublicable(tx, id)

    await bloquearAutor(tx, idUsuario)
    if ((await contarPropuestas(tx, idUsuario, ['en_revision'])) >= MAX_PROPUESTAS_EN_REVISION) {
      throw new ErrorLimitePropuestas(
        `Ya tienes ${MAX_PROPUESTAS_EN_REVISION} propuestas en revisión. Espera a que se decida sobre alguna.`,
      )
    }

    await cambiarEstado(tx, tipo, id, {
      estatus: 'en_revision',
      fechaEnvio: new Date(),
      decisionSinVer: false,
    })
    await registrar(tx, { tipo, id, titulo: fila.titulo, actor: idUsuario, accion: 'enviada' })
  })
}

/** Retirar mi envío mientras nadie ha decidido: vuelve a borrador. */
export async function cancelarEnvio(
  tipo: TipoContenido,
  id: string,
  idUsuario: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const fila = await bloquearContenido(tx, tipo, id)
    if (!fila || fila.origen !== 'propuesta' || fila.idUsuarioAutor !== idUsuario) {
      throw noEncontrado(tipo)
    }
    if (fila.estatus !== 'en_revision') {
      throw new ErrorRevisionDesactualizada(
        'Tu propuesta ya no está en revisión: se decidió sobre ella mientras tanto.',
      )
    }
    await cambiarEstado(tx, tipo, id, { estatus: 'borrador', fechaEnvio: null })
    await registrar(tx, { tipo, id, titulo: fila.titulo, actor: idUsuario, accion: 'cancelada' })
  })
}

// ---- Lo que ve el administrador ----

export interface ElementoCola {
  tipo: TipoContenido
  id: string
  titulo: string
  autor: string | null
  fechaEnvio: string
}

/** La cola de revisión: lo enviado, el más antiguo primero. */
export async function listarCola(): Promise<ElementoCola[]> {
  const where = { origen: 'propuesta' as const, estatus: 'en_revision' as const }
  const select = { titulo: true, fechaEnvio: true, idUsuarioAutor: true } as const
  const [recursos, cursos] = await Promise.all([
    prisma.recursoFormativo.findMany({ where, select: { idRecurso: true, ...select } }),
    prisma.curso.findMany({ where, select: { idCurso: true, ...select } }),
  ])
  const filas = [
    ...recursos.map(({ idRecurso, ...r }) => ({ tipo: 'recurso' as const, id: idRecurso, ...r })),
    ...cursos.map(({ idCurso, ...c }) => ({ tipo: 'curso' as const, id: idCurso, ...c })),
  ]
  const nombres = new Map<string, string | null>()
  for (const idAutor of new Set(filas.map((f) => f.idUsuarioAutor).filter(Boolean))) {
    nombres.set(idAutor as string, await nombreCompletoDe(idAutor as string))
  }
  return filas
    .map((f) => ({
      tipo: f.tipo,
      id: f.id,
      titulo: f.titulo,
      autor: f.idUsuarioAutor ? (nombres.get(f.idUsuarioAutor) ?? null) : null,
      // Una propuesta en revisión siempre tiene fecha de envío.
      fechaEnvio: (f.fechaEnvio ?? new Date(0)).toISOString(),
    }))
    .sort((a, b) => a.fechaEnvio.localeCompare(b.fechaEnvio) || a.id.localeCompare(b.id))
}

export type ContenidoEnRevision =
  | { tipo: 'recurso'; recurso: RecursoAdminDetalle; historial: EntradaHistorial[] }
  | { tipo: 'curso'; curso: CursoAdmin; historial: EntradaHistorial[] }

/** Una propuesta para revisarla: todo su contenido y su historial. Solo las
 * propuestas; una que su autor prepara responde 404. */
export async function obtenerParaRevision(
  tipo: TipoContenido,
  id: string,
): Promise<ContenidoEnRevision> {
  const historial = await historialDe(tipo, id, { conActor: true })
  if (tipo === 'recurso') {
    const recurso = await obtenerRecursoAdmin(id, ADMIN)
    if (recurso.origen !== 'propuesta') throw noEncontrado(tipo)
    return { tipo, recurso, historial }
  }
  const curso = await obtenerCursoAdmin(id, ADMIN)
  if (curso.origen !== 'propuesta') throw noEncontrado(tipo)
  return { tipo, curso, historial }
}

const DESDE: Readonly<Record<DecisionRevision, EstatusRecurso>> = {
  aprobar: 'en_revision',
  pedir_cambios: 'en_revision',
  rechazar: 'en_revision',
  retirar: 'publicado',
  publicar_de_nuevo: 'retirado',
}

const HACIA: Readonly<Record<DecisionRevision, EstatusRecurso>> = {
  aprobar: 'publicado',
  pedir_cambios: 'cambios_solicitados',
  rechazar: 'rechazado',
  retirar: 'retirado',
  publicar_de_nuevo: 'publicado',
}

const ACCION: Readonly<Record<DecisionRevision, AccionRevision>> = {
  aprobar: 'aprobada',
  pedir_cambios: 'cambios_solicitados',
  rechazar: 'rechazada',
  retirar: 'retirada',
  publicar_de_nuevo: 'publicada_de_nuevo',
}

/**
 * Una decisión del administrador sobre una propuesta, con su motivo. Con la
 * fila bloqueada, la propuesta debe seguir en el estado del que parte la
 * decisión: si el autor canceló el envío u otro administrador decidió antes,
 * responde 409 en lugar de decidir sobre algo que ya cambió.
 *
 * Publicar exige los mínimos. En un curso, sus recursos se bloquean antes en
 * modo compartido: un recurso que alguien retira a la vez no deja publicado
 * un curso con una lección que no se abre.
 */
export async function decidir(
  tipo: TipoContenido,
  id: string,
  idAdmin: string,
  { decision, motivo, criterios }: DecisionValidada,
): Promise<EstatusRecurso> {
  const destino = HACIA[decision]
  await prisma.$transaction(async (tx) => {
    const fila = await bloquearContenido(tx, tipo, id)
    if (!fila || fila.origen !== 'propuesta') throw noEncontrado(tipo)
    if (fila.estatus !== DESDE[decision]) throw new ErrorRevisionDesactualizada()

    if (destino === 'publicado') {
      if (tipo === 'curso') {
        await bloquearRecursosDeLecciones(tx, id)
        await validarCursoPublicable(tx, id)
      } else {
        await validarRecursoPublicable(tx, id)
      }
    }

    await cambiarEstado(tx, tipo, id, { estatus: destino, fechaEnvio: null, decisionSinVer: true })
    await registrar(tx, {
      tipo,
      id,
      titulo: fila.titulo,
      actor: idAdmin,
      accion: ACCION[decision],
      motivo,
      criterios,
    })
    // Al final: retirar o volver a publicar mueve lo que cuenta en cursos y
    // rutas, y el candado de las constancias es lo último que se pide.
    if (destino === 'publicado' || destino === 'retirado') {
      if (tipo === 'recurso') await alCambiarEstatusRecurso(tx, id)
      else await alCambiarEstatusCurso(tx, id)
    }
  })
  return destino
}
