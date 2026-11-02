import { randomUUID } from 'node:crypto'
import type { EstadoSolicitudNombre } from '@prisma/client'
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
 * un administrador nunca aprueba algo distinto de lo que vio. Aprobada o
 * rechazada, se conserva para avisarle a la persona hasta que la descarte.
 */

export type { EstadoSolicitudNombre }

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

  // Un solo upsert sobre idUsuario, que Prisma ejecuta como INSERT ... ON
  // CONFLICT: dos envíos simultáneos no chocan con el índice único, el último
  // gana. Al reemplazar se le da otro identificador, y una aprobación dirigida
  // a la anterior falla en vez de aplicar un nombre que el administrador no vio.
  return prisma.solicitudCambioNombre.upsert({
    where: { idUsuario },
    create: { idSolicitud: randomUUID(), idUsuario, ...datos },
    update: {
      idSolicitud: randomUUID(),
      ...datos,
      estado: 'pendiente',
      motivoRechazo: null,
      creadaEn: new Date(),
      resueltaEn: null,
    },
    select: CAMPOS_SOLICITUD,
  })
}

/**
 * Cancela la solicitud pendiente o descarta el aviso de una resuelta. Solo si
 * sigue siendo la que la persona tiene a la vista: mismo identificador y mismo
 * estado. Así, cancelar desde una pestaña vieja no borra la que envió desde
 * otra, ni el aviso de una resolución que todavía no ha visto.
 */
export async function descartarSolicitudPropia(
  idUsuario: string,
  idSolicitud: string,
  estado: EstadoSolicitudNombre,
): Promise<void> {
  const { count } = await prisma.solicitudCambioNombre.deleteMany({
    where: { idUsuario, idSolicitud, estado },
  })
  if (count === 0) {
    throw new ErrorSolicitudNoEncontrada('Tu solicitud cambió mientras tanto. Revisa su estado.')
  }
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
 * Aplica el nombre solicitado y marca la solicitud como aprobada, en una sola
 * transacción. El cambio de estado condicionado a que siga pendiente es lo que
 * decide: si la persona la canceló o la reemplazó, u otro administrador la
 * resolvió, no cambia nada.
 */
export async function aprobarSolicitud(idSolicitud: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.solicitudCambioNombre.updateMany({
      where: { idSolicitud, estado: 'pendiente' },
      data: { estado: 'aprobada', resueltaEn: new Date() },
    })
    if (count === 0) throw new ErrorSolicitudNoEncontrada()

    const solicitud = await tx.solicitudCambioNombre.findUniqueOrThrow({ where: { idSolicitud } })
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
