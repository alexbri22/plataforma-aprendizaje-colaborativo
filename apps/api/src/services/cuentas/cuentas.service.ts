import { Prisma, type TipoCuenta } from '@prisma/client'
import { prisma } from '../../data/prisma.js'
import {
  ErrorCorreoDuplicado,
  ErrorCredencialesInvalidas,
  ErrorCuentaDesactivada,
  ErrorSinSesion,
} from '../../errores.js'
import { hashContrasena, verificarContrasena } from './contrasena.js'
import { calcularExpiracionAbsoluta, generarIdSesion, sesionInactivaDesde } from './sesiones.js'
import type { CredencialesValidadas, DatosRegistroValidados } from './validacion.js'

export interface UsuarioPublico {
  idUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  correo: string
  tipoCuenta: TipoCuenta
}

export interface SesionCreada {
  id: string
  expiraEn: Date
}

interface FilaUsuario {
  idUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  correo: string
  tipoCuenta: TipoCuenta
}

function aUsuarioPublico(usuario: FilaUsuario): UsuarioPublico {
  return {
    idUsuario: usuario.idUsuario,
    nombre: usuario.nombre,
    apellidoPaterno: usuario.apellidoPaterno,
    apellidoMaterno: usuario.apellidoMaterno,
    correo: usuario.correo,
    tipoCuenta: usuario.tipoCuenta,
  }
}

async function crearSesion(idUsuario: string): Promise<SesionCreada> {
  const sesion = await prisma.sesion.create({
    data: { id: generarIdSesion(), idUsuario, expiraEn: calcularExpiracionAbsoluta() },
  })
  return { id: sesion.id, expiraEn: sesion.expiraEn }
}

export async function registrarUsuario(
  datos: DatosRegistroValidados,
): Promise<{ usuario: UsuarioPublico; sesion: SesionCreada }> {
  const contrasenaHash = await hashContrasena(datos.contrasena)

  let usuario
  try {
    usuario = await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        apellidoPaterno: datos.apellidoPaterno,
        apellidoMaterno: datos.apellidoMaterno,
        nivelEstudios: datos.nivelEstudios,
        institucionEducativa: datos.institucionEducativa,
        correo: datos.correo,
        contrasena: contrasenaHash,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ErrorCorreoDuplicado()
    }
    throw error
  }

  // Registro | Al completarse, sesión iniciada y destino en mis actividades
  // (docs/diseno-desarrollo-nucleo.md §6.6).
  const sesion = await crearSesion(usuario.idUsuario)
  return { usuario: aUsuarioPublico(usuario), sesion }
}

export async function iniciarSesion(
  credenciales: CredencialesValidadas,
): Promise<{ usuario: UsuarioPublico; sesion: SesionCreada }> {
  const usuario = await prisma.usuario.findUnique({ where: { correo: credenciales.correo } })

  // La respuesta no distingue correo inexistente de contraseña incorrecta
  // (docs/diseno-desarrollo-nucleo.md §3.2).
  if (!usuario || !(await verificarContrasena(usuario.contrasena, credenciales.contrasena))) {
    throw new ErrorCredencialesInvalidas()
  }

  if (usuario.estadoCuenta === 'desactivada') {
    throw new ErrorCuentaDesactivada()
  }

  const sesion = await crearSesion(usuario.idUsuario)
  return { usuario: aUsuarioPublico(usuario), sesion }
}

export async function cerrarSesion(idSesion: string): Promise<void> {
  // Elimina el registro en el servidor, no solo la cookie del navegador
  // (docs/diseno-desarrollo-nucleo.md §3.2).
  await prisma.sesion.deleteMany({ where: { id: idSesion } })
}

export async function obtenerActorPorSesion(idSesion: string): Promise<UsuarioPublico> {
  const sesion = await prisma.sesion.findUnique({
    where: { id: idSesion },
    include: { usuario: true },
  })

  const ahora = new Date()
  const vencida =
    !sesion ||
    sesion.expiraEn < ahora ||
    sesionInactivaDesde(sesion.ultimaActividad, ahora) ||
    sesion.usuario.estadoCuenta === 'desactivada'

  if (vencida) {
    if (sesion) await prisma.sesion.delete({ where: { id: idSesion } }).catch(() => undefined)
    throw new ErrorSinSesion()
  }

  await prisma.sesion.update({ where: { id: idSesion }, data: { ultimaActividad: ahora } })

  return aUsuarioPublico(sesion.usuario)
}
