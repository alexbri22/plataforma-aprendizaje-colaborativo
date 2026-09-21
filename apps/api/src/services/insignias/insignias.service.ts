import type { FuenteOtorgamiento } from '@prisma/client'
import {
  CATEGORIAS_INSIGNIA,
  type CategoriaInsignia,
  PUNTOS_POR_FUENTE,
  personasReconocibles,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorFueraDePlazo, ErrorSinPermiso, ErrorValidacion } from '../../errores.js'
import {
  listarParticipantes,
  obtenerMembresiaActiva,
  type MembresiaEnActividad,
  type RolActividad,
} from '../actividades/actividades.service.js'

/*
 * Reglas del otorgamiento (docs/concepto-producto.md §6 y
 * docs/diseno-desarrollo-general.md §4.6). Viven aquí y no en el esquema
 * porque ninguna es expresable como restricción de unicidad: el presupuesto
 * cuenta receptores distintos, la pertenencia a la misma actividad cruza dos
 * membresías, y la ventana de tiempo depende de fechas de la actividad.
 *
 * Deviación documentada: mientras no exista Equipo, los "compañeros" de un
 * participante son todos los participantes de la actividad. El presupuesto se
 * calcula sobre ese conjunto. Al llegar los equipos, listarCompaneros se acota
 * y nada más cambia.
 */

const DIA_EN_MS = 24 * 60 * 60 * 1000
const LARGO_MAXIMO_FRASE = 140

export interface ReconocimientoEntrada {
  idMembresiaReceptor: string
  categoria: string
  frase: string
}

export interface ReconocimientoPropio {
  idMembresiaReceptor: string
  categoria: CategoriaInsignia
  frase: string
}

export interface ReconocimientoRecibido {
  categoria: CategoriaInsignia
  frase: string
  puntos: number
  fuente: FuenteOtorgamiento
}

export interface ReconocimientoRecibidoConAutor extends ReconocimientoRecibido {
  otorgadoPor: string | null
}

export interface ContextoReconocimiento {
  actividad: { id: string; nombre: string }
  rol: RolActividad
  idMembresiaActor: string
  companeros: { idMembresia: string; nombre: string }[]
  /** A cuánta gente puede reconocer. Null para organizador y co-organizador,
   * que no tienen presupuesto: su papel es compensar a quien los pares no
   * vieron, no competir con ellos. */
  presupuesto: number | null
  /** Fin del periodo de cierre: hasta cuándo se puede editar, y desde cuándo
   * se aplica lo guardado. */
  fechaLimite: string
  /** Si hoy se puede reconocer: entre el término de la actividad y el fin del
   * cierre. */
  abierto: boolean
  /** Si lo guardado ya se aplicó y es visible para quien lo recibió. */
  aplicados: boolean
}

function fechaLimiteDe(actividad: MembresiaEnActividad['actividad']): Date {
  return new Date(actividad.fechaTermino.getTime() + actividad.plazoCierreDias * DIA_EN_MS)
}

// Las fechas de la actividad son de calendario (YYYY-MM-DD guardadas a
// medianoche UTC). El término cuenta desde el inicio de ese día y el límite
// hasta el final del suyo, para que "cierra el 14" incluya el 14 completo.
function ventana(actividad: MembresiaEnActividad['actividad'], ahora: Date) {
  const inicio = actividad.fechaTermino.getTime()
  const fin = fechaLimiteDe(actividad).getTime() + DIA_EN_MS - 1
  const t = ahora.getTime()
  return { abierto: t >= inicio && t <= fin, aplicados: t > fin }
}

function fuenteDe(rol: RolActividad): 'par' | 'organizador' {
  // Co-organizadores tienen los mismos permisos de otorgamiento que el
  // organizador (docs/diseno-desarrollo-general.md §7.3) y su reconocimiento
  // vale lo mismo: modera la popularidad, no participa de ella.
  return rol === 'participante' ? 'par' : 'organizador'
}

function esCategoria(valor: string): valor is CategoriaInsignia {
  return (CATEGORIAS_INSIGNIA as readonly string[]).includes(valor)
}

export async function contextoDeReconocimiento(
  idUsuario: string,
  idActividad: string,
  ahora = new Date(),
): Promise<ContextoReconocimiento> {
  const membresia = await obtenerMembresiaActiva(idUsuario, idActividad)
  const participantes = await listarParticipantes(idActividad)
  const rol = rolDe(membresia)
  const companeros = participantes
    .filter((p) => p.idMembresia !== membresia.idMembresia)
    .map(({ idMembresia, nombre }) => ({ idMembresia, nombre }))

  const { abierto, aplicados } = ventana(membresia.actividad, ahora)

  return {
    actividad: { id: idActividad, nombre: membresia.actividad.nombre },
    rol,
    idMembresiaActor: membresia.idMembresia,
    companeros,
    // El tamaño del equipo incluye a quien reconoce: personasReconocibles ya
    // descuenta a esa persona.
    presupuesto: rol === 'participante' ? personasReconocibles(participantes.length) : null,
    fechaLimite: fechaLimiteDe(membresia.actividad).toISOString().slice(0, 10),
    abierto,
    aplicados,
  }
}

function rolDe(membresia: MembresiaEnActividad): RolActividad {
  return membresia.rol === 'co_organizador' ? 'co-organizador' : membresia.rol
}

export async function listarMisReconocimientos(
  idUsuario: string,
  idActividad: string,
): Promise<ReconocimientoPropio[]> {
  const membresia = await obtenerMembresiaActiva(idUsuario, idActividad)
  const filas = await prisma.insigniaOtorgada.findMany({
    where: { idMembresiaOtorgante: membresia.idMembresia },
    orderBy: { fecha: 'asc' },
  })
  return filas.map((f) => ({
    idMembresiaReceptor: f.idMembresiaReceptor,
    categoria: f.categoria as CategoriaInsignia,
    frase: f.frase,
  }))
}

/**
 * Reemplaza el conjunto completo de reconocimientos del actor en la actividad.
 * Es un guardado de borrador, no un alta: hasta el fin del cierre se puede
 * volver a mandar la lista entera y queda esa. Por eso el endpoint es PUT.
 */
export async function guardarMisReconocimientos(
  idUsuario: string,
  idActividad: string,
  entradas: ReconocimientoEntrada[],
  ahora = new Date(),
): Promise<ReconocimientoPropio[]> {
  const membresia = await obtenerMembresiaActiva(idUsuario, idActividad)
  const { abierto, aplicados } = ventana(membresia.actividad, ahora)

  if (aplicados) {
    throw new ErrorFueraDePlazo(
      'El periodo de cierre terminó: los reconocimientos ya se aplicaron.',
    )
  }
  if (!abierto) {
    throw new ErrorFueraDePlazo('Los reconocimientos se dan al terminar la actividad, no antes.')
  }

  const rol = rolDe(membresia)
  const participantes = await listarParticipantes(idActividad)
  const receptoresValidos = new Set(
    participantes.map((p) => p.idMembresia).filter((id) => id !== membresia.idMembresia),
  )

  const detallePorCampo: Record<string, string> = {}
  const vistos = new Set<string>()
  const validadas: ReconocimientoPropio[] = []

  entradas.forEach((entrada, i) => {
    const clave = `reconocimientos[${i}]`
    if (!receptoresValidos.has(entrada.idMembresiaReceptor)) {
      // Cubre tres casos con un solo mensaje: no es de esta actividad, no es
      // participante, o es el propio actor. Distinguirlos no ayuda a quien
      // usa la interfaz, que nunca los ve, y sí revela membresías ajenas.
      detallePorCampo[`${clave}.idMembresiaReceptor`] =
        'No es un compañero al que puedas reconocer.'
      return
    }
    if (!esCategoria(entrada.categoria)) {
      detallePorCampo[`${clave}.categoria`] = 'Categoría desconocida.'
      return
    }
    const frase = typeof entrada.frase === 'string' ? entrada.frase.trim() : ''
    if (!frase) {
      detallePorCampo[`${clave}.frase`] = 'Cada reconocimiento lleva una frase.'
      return
    }
    if (frase.length > LARGO_MAXIMO_FRASE) {
      detallePorCampo[`${clave}.frase`] =
        `La frase no puede pasar de ${LARGO_MAXIMO_FRASE} caracteres.`
      return
    }
    const duplicado = `${entrada.idMembresiaReceptor}::${entrada.categoria}`
    if (vistos.has(duplicado)) {
      detallePorCampo[`${clave}.categoria`] =
        'La misma insignia no se da dos veces a la misma persona.'
      return
    }
    vistos.add(duplicado)
    validadas.push({
      idMembresiaReceptor: entrada.idMembresiaReceptor,
      categoria: entrada.categoria,
      frase,
    })
  })

  if (rol === 'participante') {
    const presupuesto = personasReconocibles(participantes.length)
    const receptores = new Set(validadas.map((v) => v.idMembresiaReceptor)).size
    if (receptores > presupuesto) {
      detallePorCampo.reconocimientos =
        presupuesto === 1
          ? `Puedes reconocer a una sola persona; elegiste a ${receptores}.`
          : `Puedes reconocer a ${presupuesto} compañeros como máximo; elegiste a ${receptores}.`
    }
  }

  if (Object.keys(detallePorCampo).length > 0) throw new ErrorValidacion(detallePorCampo)

  const fuente = fuenteDe(rol)
  const puntos = PUNTOS_POR_FUENTE[fuente]

  await prisma.$transaction([
    prisma.insigniaOtorgada.deleteMany({ where: { idMembresiaOtorgante: membresia.idMembresia } }),
    prisma.insigniaOtorgada.createMany({
      data: validadas.map((v) => ({
        categoria: v.categoria,
        idMembresiaOtorgante: membresia.idMembresia,
        idMembresiaReceptor: v.idMembresiaReceptor,
        fuente,
        puntos,
        frase: v.frase,
      })),
    }),
  ])

  return validadas
}

/**
 * Lo que el actor recibió en la actividad, sin autoría. Solo después de que
 * el cierre termine: revelar durante la ventana lo que otros dieron invita a
 * responder en especie, que es justo lo que el anonimato quiere evitar.
 */
export async function listarRecibidos(
  idUsuario: string,
  idActividad: string,
  ahora = new Date(),
): Promise<{ aplicados: boolean; fechaLimite: string; reconocimientos: ReconocimientoRecibido[] }> {
  const membresia = await obtenerMembresiaActiva(idUsuario, idActividad)
  const { aplicados } = ventana(membresia.actividad, ahora)
  const fechaLimite = fechaLimiteDe(membresia.actividad).toISOString().slice(0, 10)

  if (!aplicados) return { aplicados, fechaLimite, reconocimientos: [] }

  const filas = await prisma.insigniaOtorgada.findMany({
    where: { idMembresiaReceptor: membresia.idMembresia },
    orderBy: [{ categoria: 'asc' }, { fecha: 'asc' }],
  })
  return {
    aplicados,
    fechaLimite,
    reconocimientos: filas.map((f) => ({
      categoria: f.categoria as CategoriaInsignia,
      frase: f.frase,
      puntos: f.puntos,
      fuente: f.fuente,
    })),
  }
}

/**
 * Lo que recibió un participante concreto, con autoría, para quien organiza.
 * Disponible en cualquier momento: la validación ligera del organizador
 * ocurre durante la ventana, no después (concepto §6).
 */
export async function listarRecibidosDeParticipante(
  idUsuarioActor: string,
  idActividad: string,
  idMembresiaParticipante: string,
): Promise<{
  participante: { idMembresia: string; nombre: string }
  reconocimientos: ReconocimientoRecibidoConAutor[]
}> {
  const membresia = await obtenerMembresiaActiva(idUsuarioActor, idActividad)
  if (rolDe(membresia) === 'participante') {
    throw new ErrorSinPermiso('Solo quien organiza puede ver lo que recibieron los participantes.')
  }

  const participantes = await listarParticipantes(idActividad)
  const participante = participantes.find((p) => p.idMembresia === idMembresiaParticipante)
  if (!participante) throw new ErrorSinPermiso('Esa persona no participa en esta actividad.')

  const filas = await prisma.insigniaOtorgada.findMany({
    where: { idMembresiaReceptor: idMembresiaParticipante },
    include: {
      otorgante: { include: { usuario: { select: { nombre: true, apellidoPaterno: true } } } },
    },
    orderBy: [{ categoria: 'asc' }, { fecha: 'asc' }],
  })

  return {
    participante: { idMembresia: participante.idMembresia, nombre: participante.nombre },
    reconocimientos: filas.map((f) => ({
      categoria: f.categoria as CategoriaInsignia,
      frase: f.frase,
      puntos: f.puntos,
      fuente: f.fuente,
      otorgadoPor: f.otorgante
        ? `${f.otorgante.usuario.nombre} ${f.otorgante.usuario.apellidoPaterno}`.trim()
        : null,
    })),
  }
}

/**
 * Acumulado del usuario por categoría, sumando solo actividades cuyo cierre
 * ya terminó. Es un cálculo, no una columna (docs/diseno-desarrollo-general.md
 * §4.5, "rango visible de un usuario").
 */
export async function acumuladoDeUsuario(
  idUsuario: string,
  ahora = new Date(),
): Promise<Partial<Record<CategoriaInsignia, number>>> {
  const filas = await prisma.insigniaOtorgada.findMany({
    where: { receptor: { idUsuario } },
    include: {
      receptor: {
        include: { actividad: { select: { fechaTermino: true, plazoCierreDias: true } } },
      },
    },
  })

  const acumulado: Partial<Record<CategoriaInsignia, number>> = {}
  for (const fila of filas) {
    if (!ventana(fila.receptor.actividad as MembresiaEnActividad['actividad'], ahora).aplicados)
      continue
    const categoria = fila.categoria as CategoriaInsignia
    acumulado[categoria] = (acumulado[categoria] ?? 0) + fila.puntos
  }
  return acumulado
}
