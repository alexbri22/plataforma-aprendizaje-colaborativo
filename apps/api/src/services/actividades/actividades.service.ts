import { Prisma, type EstadoActividad, type RolMembresia } from '@prisma/client'
import { prisma } from '../../data/prisma.js'
import { ErrorClaveInvalida, ErrorYaEsMiembro } from '../../errores.js'
import { generarClaveIngreso } from './claveIngreso.js'
import type { DatosCrearActividadValidados } from './validacion.js'

// Fase que expone la API, calcada de
// apps/web/src/features/actividades/tipos.ts (FaseActividad): cinco valores,
// sin formacion_equipos. Ese tipo ya lo pliega dentro de 'inscripcion' por
// ser transicional y breve (mismo criterio documentado ahí); el enum de la
// base de datos conserva las seis fases completas del ciclo de vida
// (docs/diseno-desarrollo-general.md §6.1).
export type FaseActividad = 'configuracion' | 'inscripcion' | 'desarrollo' | 'cierre' | 'archivada'

export type RolActividad = 'organizador' | 'co-organizador' | 'participante'

export interface ActividadRespuesta {
  id: string
  nombre: string
  objetivo: string
  fase: FaseActividad
  rol: RolActividad
  numParticipantes: number
  fechaClave: string
  claveIngreso?: string
  informacionGeneral: string
  fechaInicio: string
  fechaTermino: string
  fechaLimiteInscripcion: string
  plazoCierreDias: number
  numeroEquiposEsperado: number
}

const FASE_POR_ESTADO: Record<EstadoActividad, FaseActividad> = {
  configuracion: 'configuracion',
  inscripcion: 'inscripcion',
  formacion_equipos: 'inscripcion',
  desarrollo: 'desarrollo',
  cierre: 'cierre',
  archivada: 'archivada',
}

const ROL_POR_ROL_MEMBRESIA: Record<RolMembresia, RolActividad> = {
  organizador: 'organizador',
  co_organizador: 'co-organizador',
  participante: 'participante',
}

interface ActividadConMembresiasYConteo {
  idActividad: string
  nombre: string
  objetivo: string
  informacionGeneral: string
  fechaInicio: Date
  fechaTermino: Date
  fechaLimiteInscripcion: Date
  plazoCierreDias: number
  numeroEquiposEsperado: number
  estado: EstadoActividad
  claveIngreso: string | null
  membresias: { rol: RolMembresia }[]
}

// Las tres son fechas de calendario, no instantes (el formulario de creación
// solo captura año/mes/día vía <input type="date">): se devuelven como
// YYYY-MM-DD y no como el datetime completo de Date#toISOString(), que es lo
// que espera apps/web/src/features/actividades/formato.ts al construir la
// fecha con año/mes/día locales (una fecha con hora rompe ese parseo y
// Intl.DateTimeFormat lanza sobre el resultado inválido).
function aFechaCalendario(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

// numParticipantes cuenta solo membresías con rol=participante, no toda
// membresía activa: co-organizadores no son "participantes" del trabajo en
// equipo (docs/diseno-desarrollo-nucleo.md §7.7 no lo distingue; al nacer la
// actividad solo existe el organizador, así que ambas lecturas dan 0 aquí).
function aRespuesta(
  actividad: ActividadConMembresiasYConteo,
  rolDelActor: RolMembresia,
): ActividadRespuesta {
  const numParticipantes = actividad.membresias.filter((m) => m.rol === 'participante').length

  return {
    id: actividad.idActividad,
    nombre: actividad.nombre,
    objetivo: actividad.objetivo,
    fase: FASE_POR_ESTADO[actividad.estado],
    rol: ROL_POR_ROL_MEMBRESIA[rolDelActor],
    numParticipantes,
    // Texto derivado, no una columna (docs/diseno-desarrollo-nucleo.md §7.2):
    // igual que apps/web/.../actividades.api.ts construye su mock.
    fechaClave: `Clave: ${actividad.claveIngreso}`,
    claveIngreso: actividad.claveIngreso ?? undefined,
    informacionGeneral: actividad.informacionGeneral,
    fechaInicio: aFechaCalendario(actividad.fechaInicio),
    fechaTermino: aFechaCalendario(actividad.fechaTermino),
    fechaLimiteInscripcion: aFechaCalendario(actividad.fechaLimiteInscripcion),
    plazoCierreDias: actividad.plazoCierreDias,
    numeroEquiposEsperado: actividad.numeroEquiposEsperado,
  }
}

const INTENTOS_MAXIMOS_CLAVE_INGRESO = 5

function esColisionClaveIngreso(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    (error.meta?.target as string[] | undefined)?.includes('clave_ingreso') === true
  )
}

// Crea la actividad y, en la misma transacción, la membresía de organizador
// para quien la crea (docs/diseno-desarrollo-nucleo.md §7.7). La clave de
// ingreso se genera aquí y no al abrir la inscripción por separado: decisión
// de producto documentada en docs/diseno-desarrollo-general.md §5.1. Se
// reintenta en colisión de unicidad de la clave (§7.2).
export async function crearActividad(
  idUsuarioOrganizador: string,
  datos: DatosCrearActividadValidados,
): Promise<ActividadRespuesta> {
  for (let intento = 1; intento <= INTENTOS_MAXIMOS_CLAVE_INGRESO; intento += 1) {
    const claveIngreso = generarClaveIngreso()

    try {
      const actividad = await prisma.$transaction(async (tx) => {
        const creada = await tx.actividad.create({
          data: {
            nombre: datos.nombre,
            objetivo: datos.objetivo,
            informacionGeneral: datos.informacionGeneral,
            fechaInicio: datos.fechaInicio,
            fechaTermino: datos.fechaTermino,
            fechaLimiteInscripcion: datos.fechaLimiteInscripcion,
            plazoCierreDias: datos.plazoCierreDias,
            numeroEquiposEsperado: datos.numeroEquiposEsperado,
            estado: 'inscripcion',
            claveIngreso,
          },
        })

        await tx.membresia.create({
          data: {
            idActividad: creada.idActividad,
            idUsuario: idUsuarioOrganizador,
            rol: 'organizador',
            estado: 'activa',
          },
        })

        return creada
      })

      return aRespuesta({ ...actividad, membresias: [] }, 'organizador')
    } catch (error) {
      if (esColisionClaveIngreso(error) && intento < INTENTOS_MAXIMOS_CLAVE_INGRESO) continue
      throw error
    }
  }

  // Inalcanzable: el bucle anterior siempre retorna o lanza.
  throw new Error('No fue posible generar una clave de ingreso única.')
}

// Actividades donde el actor tiene membresía activa, con su rol en cada una
// (docs/diseno-desarrollo-nucleo.md §7.7, clave de query ['actividades'] de
// §4.2).
export async function listarActividadesDeUsuario(idUsuario: string): Promise<ActividadRespuesta[]> {
  const membresias = await prisma.membresia.findMany({
    where: { idUsuario, estado: 'activa' },
    include: { actividad: { include: { membresias: { select: { rol: true } } } } },
    orderBy: { fechaUnion: 'desc' },
  })

  return membresias.map((membresia) => aRespuesta(membresia.actividad, membresia.rol))
}

export interface VistaPreviaActividad {
  nombre: string
  objetivo: string
  nombreOrganizador: string
}

interface UsuarioNombre {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
}

function nombreCompleto(usuario: UsuarioNombre): string {
  return `${usuario.nombre} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`
}

// Busca la actividad que admite unión con esta clave, en la fase de
// inscripción únicamente: una clave cuya actividad ya avanzó de fase "deja de
// funcionar... y no se reactiva" (docs/diseno-desarrollo-nucleo.md §7.2), así
// que se trata igual que una clave que no corresponde a nada (§7.2, ver
// ErrorClaveInvalida).
async function actividadJoinablePorClave(clave: string) {
  return prisma.actividad.findFirst({ where: { claveIngreso: clave, estado: 'inscripcion' } })
}

// GET /api/claves/{clave} (docs/diseno-desarrollo-nucleo.md §7.7 y §3.3): la
// única ruta de la API que no exige membresía, así que devuelve solo lo
// mínimo para decidir si unirse — nombre, objetivo y quién organiza — y nada
// que permita distinguir esta actividad de otra ajena.
export async function buscarActividadPorClave(clave: string): Promise<VistaPreviaActividad> {
  const actividad = await actividadJoinablePorClave(clave)
  if (!actividad) throw new ErrorClaveInvalida()

  const organizador = await prisma.membresia.findFirst({
    where: { idActividad: actividad.idActividad, rol: 'organizador' },
    include: {
      usuario: { select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true } },
    },
  })
  // Toda actividad tiene exactamente una membresía de organizador
  // (docs/diseno-desarrollo-general.md §4.6): si falta, es un dato
  // inconsistente y no una clave inválida.
  if (!organizador) throw new Error('La actividad no tiene organizador.')

  return {
    nombre: actividad.nombre,
    objetivo: actividad.objetivo,
    nombreOrganizador: nombreCompleto(organizador.usuario),
  }
}

// POST /api/claves/{clave}/union (docs/diseno-desarrollo-nucleo.md §7.7): se
// une como participante. La colisión de unicidad (idActividad, idUsuario) es
// la fuente de verdad de "ya es miembro" y no una comprobación previa, para
// no dejar una ventana entre leer y escribir.
export async function unirseConClave(
  clave: string,
  idUsuario: string,
): Promise<ActividadRespuesta> {
  const actividad = await actividadJoinablePorClave(clave)
  if (!actividad) throw new ErrorClaveInvalida()

  try {
    await prisma.membresia.create({
      data: {
        idActividad: actividad.idActividad,
        idUsuario,
        rol: 'participante',
        estado: 'activa',
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ErrorYaEsMiembro()
    }
    throw error
  }

  const actividadActualizada = await prisma.actividad.findUniqueOrThrow({
    where: { idActividad: actividad.idActividad },
    include: { membresias: { select: { rol: true } } },
  })

  return aRespuesta(actividadActualizada, 'participante')
}
