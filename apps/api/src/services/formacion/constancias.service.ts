import { randomInt } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import {
  ALFABETO_FOLIO,
  PREFIJO_FOLIO,
  normalizarFolio,
  type ElementoColaboracion,
  type TipoConstancia,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorConstanciaNoEncontrada } from '../../errores.js'
import { nombreCompletoDe } from '../cuentas/cuentas.service.js'

/*
 * Constancias de finalización (docs/diseno-desarrollo-formacion.md, nota del
 * incremento 5). Una constancia hace constar que una persona recorrió todas
 * las lecciones de un curso, o todos los cursos disponibles de una ruta. No es
 * un documento oficial ni una calificación: marcar una lección lo declara la
 * propia persona, y Formación no mide desempeño.
 *
 * Se emite una sola vez y no se borra ni cambia. Guarda el título, los
 * elementos y la duración tal como eran al emitirse; el nombre de la persona
 * no se guarda, se pide a Cuentas al mostrarla.
 *
 * Este módulo no importa cursos.service ni rutas.service: ellos lo importan a
 * él para emitir dentro de sus transacciones, y un ciclo entre módulos que
 * usan constantes en su nivel superior falla al cargarse.
 */

type Cliente = Prisma.TransactionClient | typeof prisma

export interface ConstanciaResumen {
  folio: string
  tipo: TipoConstancia
  titulo: string
  /** En una ruta, cuántos cursos contaron; en un curso, 0. */
  numCursos: number
  fechaFinalizacion: string
}

/** Lo que ve su dueña: además, a qué curso o ruta corresponde. */
export interface ConstanciaPropia extends ConstanciaResumen {
  idCurso: string | null
  idRuta: string | null
}

/** La página pública de verificación. Ni correo, ni progreso, ni reflexiones:
 * solo lo que la constancia hace constar. */
export interface ConstanciaVerificada extends ConstanciaPropia {
  nombre: string
  elementos: ElementoColaboracion[]
  duracionMin: number
  titulosCursos: string[]
  fechaEmision: string
  /** Si el curso o la ruta se sigue ofreciendo. La constancia vale igual. */
  enCatalogo: boolean
}

// ---- Folio y datos derivados ----

export function generarFolio(): string {
  let s = ''
  for (let i = 0; i < 8; i++) s += ALFABETO_FOLIO[randomInt(ALFABETO_FOLIO.length)]
  return `${PREFIJO_FOLIO}-${s.slice(0, 4)}-${s.slice(4)}`
}

/** Elementos de varios cursos, del que más cursos trabajan al que menos y, a
 * igual número, en el orden en que aparecen. Es lo que muestra la ficha de una
 * ruta (derivarRuta) y lo que guarda su constancia. */
export function elementosPorFrecuencia(
  cursos: readonly { elementos: readonly string[] }[],
): { elemento: ElementoColaboracion; cursos: number }[] {
  const conteo = new Map<ElementoColaboracion, number>()
  for (const c of cursos) {
    for (const e of c.elementos as ElementoColaboracion[]) conteo.set(e, (conteo.get(e) ?? 0) + 1)
  }
  // sort es estable: a igual número se conserva el orden de aparición.
  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([elemento, n]) => ({ elemento, cursos: n }))
}

const SELECT_CURSO = {
  idCurso: true,
  titulo: true,
  elementos: true,
  estatus: true,
  lecciones: { select: { duracionMin: true, recurso: { select: { duracionMin: true } } } },
} satisfies Prisma.CursoSelect

type CursoParaConstancia = Prisma.CursoGetPayload<{ select: typeof SELECT_CURSO }>

/** Misma regla que duracionDe en cursos.service.ts: una lección de recurso
 * sin duración propia usa la del recurso. */
function duracionDe(curso: CursoParaConstancia): number {
  return curso.lecciones.reduce(
    (total, l) => total + (l.duracionMin ?? l.recurso?.duracionMin ?? 0),
    0,
  )
}

const ORDEN_CONSTANCIAS = [
  { fechaFinalizacion: 'desc' },
  // Una ruta termina en el mismo instante que su último curso: va primero.
  { tipo: 'desc' },
  { folio: 'asc' },
] satisfies Prisma.ConstanciaOrderByWithRelationInput[]

type FilaConstancia = Prisma.ConstanciaGetPayload<object>

function aResumen(fila: FilaConstancia): ConstanciaResumen {
  return {
    folio: fila.folio,
    tipo: fila.tipo,
    titulo: fila.titulo,
    numCursos: fila.titulosCursos.length,
    fechaFinalizacion: fila.fechaFinalizacion.toISOString(),
  }
}

function aPropia(fila: FilaConstancia): ConstanciaPropia {
  return { ...aResumen(fila), idCurso: fila.idCurso, idRuta: fila.idRuta }
}

// ---- Emisión ----

type NuevaConstancia = Omit<Prisma.ConstanciaCreateManyInput, 'idConstancia' | 'folio'>

const clave = (c: { idUsuario: string; idCurso?: string | null; idRuta?: string | null }) =>
  `${c.idUsuario}|${c.idCurso ?? ''}|${c.idRuta ?? ''}`

/**
 * Inserta las que todavía no existen y devuelve las que insertó. Si dos folios
 * chocan (40 bits al azar: casi imposible), la fila no entra por la unicidad
 * del folio y se reintenta con otro; si la que falta es porque ya existía, no.
 */
async function insertarFaltantes(
  tx: Prisma.TransactionClient,
  nuevas: NuevaConstancia[],
): Promise<ConstanciaResumen[]> {
  if (nuevas.length === 0) return []
  const existentes = async () =>
    tx.constancia.findMany({
      where: {
        OR: nuevas.map((n) =>
          n.tipo === 'curso'
            ? { idUsuario: n.idUsuario, idCurso: n.idCurso }
            : { idUsuario: n.idUsuario, idRuta: n.idRuta },
        ),
      },
    })

  const yaEstaban = new Set((await existentes()).map(clave))
  let pendientes = nuevas.filter((n) => !yaEstaban.has(clave(n)))
  const objetivo = new Set(pendientes.map(clave))

  for (let intento = 0; pendientes.length > 0 && intento < 5; intento++) {
    await tx.constancia.createMany({
      data: pendientes.map((n) => ({ ...n, folio: generarFolio() })),
      skipDuplicates: true,
    })
    const ahora = new Set((await existentes()).map(clave))
    pendientes = pendientes.filter((n) => !ahora.has(clave(n)))
  }
  if (pendientes.length > 0)
    throw new Error('No se pudo generar un folio único para la constancia.')

  const filas = await existentes()
  return filas
    .filter((f) => objetivo.has(clave(f)))
    .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'curso' ? -1 : 1))
    .map(aResumen)
}

/**
 * Emite la constancia de cada inscripción que acaba de terminar. Se llama en
 * la misma transacción que fija la fecha de finalización, con la inscripción
 * ya bloqueada (FOR UPDATE): la emisión no necesita otro bloqueo.
 */
export async function emitirConstanciasDeCurso(
  tx: Prisma.TransactionClient,
  idsInscripcion: readonly string[],
): Promise<ConstanciaResumen[]> {
  if (idsInscripcion.length === 0) return []
  const filas = await tx.inscripcionCurso.findMany({
    where: { idInscripcion: { in: [...idsInscripcion] }, fechaFinalizacion: { not: null } },
    select: {
      idUsuario: true,
      idCurso: true,
      fechaFinalizacion: true,
      curso: { select: SELECT_CURSO },
    },
  })
  return insertarFaltantes(
    tx,
    filas.map((f) => ({
      idUsuario: f.idUsuario,
      tipo: 'curso',
      idCurso: f.idCurso,
      titulo: f.curso.titulo,
      elementos: f.curso.elementos,
      duracionMin: duracionDe(f.curso),
      fechaFinalizacion: f.fechaFinalizacion as Date,
    })),
  )
}

/** Qué revisar: las rutas dadas, o las que contienen alguno de los cursos
 * dados; y, si se indica, solo esas personas. */
export interface AlcanceRutas {
  idsRuta?: readonly string[]
  idsCurso?: readonly string[]
  idsUsuario?: readonly string[]
}

/**
 * Emite la constancia de ruta a quien ya terminó todos sus cursos disponibles.
 * Una ruta publicada está terminada cuando lo están todos sus cursos
 * publicados, y necesita al menos uno. La fecha es la de su último curso.
 *
 * Lo que decide si una ruta está terminada lo cambian transacciones distintas:
 * la persona que termina un curso, el administrador que cambia la lista de
 * cursos de la ruta, la publica o retira uno de sus cursos, y los recálculos
 * del administrador sobre un curso. Si dos de ellas corren a la vez, cada una
 * puede leer la otra sin confirmar y ninguna emitiría la constancia (por
 * ejemplo, dos pestañas que terminan los dos últimos cursos de una ruta).
 *
 * Por eso todas toman el mismo candado consultivo antes de decidir, y siempre
 * después de escribir su propio cambio: la segunda en llegar espera a que la
 * primera confirme y ve lo que escribió. El candado es lo último que se pide en
 * la transacción, y con él solo se lee y se insertan constancias, así que quien
 * lo tiene no espera a nadie. Es global, como el de la ruta destacada: se pide
 * solo cuando algo terminó o la lista de una ruta cambió, que es poco.
 */
export async function emitirConstanciasDeRutas(
  tx: Prisma.TransactionClient,
  alcance: AlcanceRutas,
): Promise<ConstanciaResumen[]> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('constancias.rutas'))`

  const rutas = await tx.rutaFormativa.findMany({
    where: {
      estatus: 'publicado',
      ...(alcance.idsRuta ? { idRuta: { in: [...alcance.idsRuta] } } : {}),
      ...(alcance.idsCurso ? { cursos: { some: { idCurso: { in: [...alcance.idsCurso] } } } } : {}),
    },
    select: {
      idRuta: true,
      titulo: true,
      cursos: { orderBy: { orden: 'asc' }, select: { curso: { select: SELECT_CURSO } } },
    },
  })

  const nuevas: NuevaConstancia[] = []
  for (const ruta of rutas) {
    const disponibles = ruta.cursos.map((c) => c.curso).filter((c) => c.estatus === 'publicado')
    if (disponibles.length === 0) continue
    const grupos = await tx.inscripcionCurso.groupBy({
      by: ['idUsuario'],
      where: {
        idCurso: { in: disponibles.map((c) => c.idCurso) },
        fechaFinalizacion: { not: null },
        ...(alcance.idsUsuario ? { idUsuario: { in: [...alcance.idsUsuario] } } : {}),
      },
      _count: { _all: true },
      _max: { fechaFinalizacion: true },
    })
    for (const g of grupos) {
      if (g._count._all !== disponibles.length) continue
      nuevas.push({
        idUsuario: g.idUsuario,
        tipo: 'ruta',
        idRuta: ruta.idRuta,
        titulo: ruta.titulo,
        elementos: elementosPorFrecuencia(disponibles).map((e) => e.elemento),
        duracionMin: disponibles.reduce((total, c) => total + duracionDe(c), 0),
        titulosCursos: disponibles.map((c) => c.titulo),
        fechaFinalizacion: g._max.fechaFinalizacion as Date,
      })
    }
  }
  return insertarFaltantes(tx, nuevas)
}

// ---- Lectura ----

async function sonPublicas(cliente: Cliente, idUsuario: string): Promise<boolean> {
  const fila = await cliente.preferenciasFormativas.findUnique({
    where: { idUsuario },
    select: { constanciasPublicas: true },
  })
  return fila?.constanciasPublicas ?? false
}

/** Mis constancias, la más reciente primero, y si las muestro en mi perfil. */
export async function listarMisConstancias(
  idUsuario: string,
): Promise<{ constancias: ConstanciaPropia[]; publicas: boolean }> {
  const [filas, publicas] = await Promise.all([
    prisma.constancia.findMany({ where: { idUsuario }, orderBy: ORDEN_CONSTANCIAS }),
    sonPublicas(prisma, idUsuario),
  ])
  return { constancias: filas.map(aPropia), publicas }
}

/** Mostrar u ocultar mis constancias en mi perfil. Una sola escritura sobre
 * mi fila: no hay lectura previa que otra petición pueda invalidar. */
export async function cambiarVisibilidadConstancias(
  idUsuario: string,
  publicas: boolean,
): Promise<boolean> {
  const fila = await prisma.preferenciasFormativas.upsert({
    where: { idUsuario },
    create: { idUsuario, constanciasPublicas: publicas },
    update: { constanciasPublicas: publicas },
    select: { constanciasPublicas: true },
  })
  return fila.constanciasPublicas
}

/**
 * Las constancias que el perfil de una persona muestra a otra. Vacía si no
 * las hizo públicas, o si la cuenta no existe: así no se distingue una cosa
 * de otra. El administrador sigue la misma regla, sin excepción: no las
 * necesita para su trabajo.
 */
export async function constanciasVisiblesDe(idUsuario: string): Promise<ConstanciaResumen[]> {
  if (!(await sonPublicas(prisma, idUsuario))) return []
  const filas = await prisma.constancia.findMany({
    where: { idUsuario },
    orderBy: ORDEN_CONSTANCIAS,
  })
  return filas.map(aResumen)
}

/** Página pública de verificación. Un folio mal escrito y uno que no existe
 * responden igual. */
export async function verificarConstancia(folioEscrito: string): Promise<ConstanciaVerificada> {
  const folio = normalizarFolio(folioEscrito)
  if (!folio) throw new ErrorConstanciaNoEncontrada()
  const fila = await prisma.constancia.findUnique({ where: { folio } })
  if (!fila) throw new ErrorConstanciaNoEncontrada()

  const [nombre, enCatalogo] = await Promise.all([
    nombreCompletoDe(fila.idUsuario),
    fila.tipo === 'curso'
      ? prisma.curso
          .count({ where: { idCurso: fila.idCurso as string, estatus: 'publicado' } })
          .then((n) => n > 0)
      : prisma.rutaFormativa
          .count({ where: { idRuta: fila.idRuta as string, estatus: 'publicado' } })
          .then((n) => n > 0),
  ])
  // La llave hacia usuarios es en cascada: sin cuenta no hay constancia.
  if (nombre === null) throw new ErrorConstanciaNoEncontrada()

  return {
    ...aPropia(fila),
    nombre,
    elementos: fila.elementos as ElementoColaboracion[],
    duracionMin: fila.duracionMin,
    titulosCursos: fila.titulosCursos,
    fechaEmision: fila.fechaEmision.toISOString(),
    enCatalogo,
  }
}
