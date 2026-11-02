import { prisma } from '../../data/prisma.js'
import {
  ErrorSolicitudNoEncontrada,
  ErrorUsuarioNoEncontrado,
  ErrorValidacion,
} from '../../errores.js'
import type { DatosPerfilValidados } from './validacion.js'

/*
 * Solicitudes de cambio de nombre (docs/diseno-desarrollo-nucleo.md §6.3). Una
 * cuenta de usuario no cambia su nombre directamente: lo pide, y el nombre
 * cambia cuando un administrador lo aprueba. Hay a lo más una por persona;
 * enviar otra reemplaza a la anterior con un identificador nuevo, de modo que
 * un administrador nunca aprueba algo distinto de lo que vio.
 */

export type EstadoSolicitudNombre = 'pendiente' | 'rechazada'

/** Lo que la persona ve de su propia solicitud. */
export interface SolicitudNombre {
  idSolicitud: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  estado: EstadoSolicitudNombre
  motivoRechazo: string | null
  creadaEn: Date
  resueltaEn: Date | null
}

/** Lo que el administrador ve: el nombre actual junto al solicitado. */
export interface SolicitudNombreAdmin {
  idSolicitud: string
  creadaEn: Date
  solicitado: { nombre: string; apellidoPaterno: string; apellidoMaterno: string }
  usuario: {
    idUsuario: string
    nombre: string
    apellidoPaterno: string
    apellidoMaterno: string
    correo: string
  }
}

const CAMPOS_SOLICITUD = {
  idSolicitud: true,
  nombre: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  estado: true,
  motivoRechazo: true,
  creadaEn: true,
  resueltaEn: true,
} as const

export async function obtenerSolicitudPropia(idUsuario: string): Promise<SolicitudNombre | null> {
  return prisma.solicitudCambioNombre.findUnique({
    where: { idUsuario },
    select: CAMPOS_SOLICITUD,
  })
}

export async function solicitarCambioNombre(
  idUsuario: string,
  datos: DatosPerfilValidados,
): Promise<SolicitudNombre> {
  const usuario = await prisma.usuario.findUnique({ where: { idUsuario } })
  if (!usuario) throw new ErrorUsuarioNoEncontrado()

  if (
    usuario.nombre === datos.nombre &&
    usuario.apellidoPaterno === datos.apellidoPaterno &&
    usuario.apellidoMaterno === datos.apellidoMaterno
  ) {
    throw new ErrorValidacion({ nombre: 'Ese ya es tu nombre.' })
  }

  // Borrar y crear en lugar de actualizar: la solicitud nueva lleva otro
  // identificador, y una aprobación dirigida a la anterior falla en vez de
  // aplicar un nombre que el administrador no vio.
  const [, solicitud] = await prisma.$transaction([
    prisma.solicitudCambioNombre.deleteMany({ where: { idUsuario } }),
    prisma.solicitudCambioNombre.create({
      data: { idUsuario, ...datos },
      select: CAMPOS_SOLICITUD,
    }),
  ])
  return solicitud
}

/** Cancela la solicitud pendiente o descarta el aviso de una rechazada. */
export async function descartarSolicitudPropia(idUsuario: string): Promise<void> {
  const { count } = await prisma.solicitudCambioNombre.deleteMany({ where: { idUsuario } })
  if (count === 0)
    throw new ErrorSolicitudNoEncontrada('No tienes una solicitud de cambio de nombre.')
}

export async function listarSolicitudesPendientes(): Promise<SolicitudNombreAdmin[]> {
  const filas = await prisma.solicitudCambioNombre.findMany({
    where: { estado: 'pendiente' },
    orderBy: { creadaEn: 'asc' },
    include: {
      usuario: {
        select: {
          idUsuario: true,
          nombre: true,
          apellidoPaterno: true,
          apellidoMaterno: true,
          correo: true,
        },
      },
    },
  })
  return filas.map((fila) => ({
    idSolicitud: fila.idSolicitud,
    creadaEn: fila.creadaEn,
    solicitado: {
      nombre: fila.nombre,
      apellidoPaterno: fila.apellidoPaterno,
      apellidoMaterno: fila.apellidoMaterno,
    },
    usuario: fila.usuario,
  }))
}

/**
 * Aplica el nombre solicitado y borra la solicitud, en una sola transacción.
 * El borrado condicionado a que siga pendiente es lo que decide: si la persona
 * la canceló o la reemplazó, u otro administrador la resolvió, no borra nada y
 * el nombre no cambia.
 */
export async function aprobarSolicitud(idSolicitud: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitudCambioNombre.findUnique({ where: { idSolicitud } })
    const { count } = await tx.solicitudCambioNombre.deleteMany({
      where: { idSolicitud, estado: 'pendiente' },
    })
    if (!solicitud || count === 0) throw new ErrorSolicitudNoEncontrada()

    await tx.usuario.update({
      where: { idUsuario: solicitud.idUsuario },
      data: {
        nombre: solicitud.nombre,
        apellidoPaterno: solicitud.apellidoPaterno,
        apellidoMaterno: solicitud.apellidoMaterno,
      },
    })
  })
}

export async function rechazarSolicitud(idSolicitud: string, motivo: string | null): Promise<void> {
  const { count } = await prisma.solicitudCambioNombre.updateMany({
    where: { idSolicitud, estado: 'pendiente' },
    data: { estado: 'rechazada', motivoRechazo: motivo, resueltaEn: new Date() },
  })
  if (count === 0) throw new ErrorSolicitudNoEncontrada()
}
