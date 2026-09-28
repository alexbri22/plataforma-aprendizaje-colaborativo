import type { EstadoCuenta, TipoCuenta } from '@prisma/client'
import { prisma } from '../../data/prisma.js'
import { ErrorUsuarioNoEncontrado } from '../../errores.js'
import { hashContrasena } from './contrasena.js'

// Superficie administrativa del módulo de Cuentas (docs/diseno-desarrollo-nucleo.md
// §6.5). El panel de administración no escribe sobre las tablas del núcleo:
// consume estas operaciones porque el estado de la cuenta es dominio del
// núcleo (docs/diseno-desarrollo-general.md §3.4).

// A diferencia de UsuarioPublico, esta vista incluye estado y fecha de
// registro porque son justo lo que el administrador gestiona
// (docs/diseno-desarrollo-general.md §7.2, "lista de usuarios registrados con
// su estado"). El correo se expone aquí de forma deliberada: es el
// identificador con el que el administrador reconoce la cuenta, no un dato de
// usuario a usuario (la restricción de §7.2 es entre cuentas de usuario).
export interface UsuarioAdmin {
  idUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  correo: string
  tipoCuenta: TipoCuenta
  estadoCuenta: EstadoCuenta
  fechaRegistro: Date
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  return prisma.usuario.findMany({
    select: {
      idUsuario: true,
      nombre: true,
      apellidoPaterno: true,
      apellidoMaterno: true,
      correo: true,
      tipoCuenta: true,
      estadoCuenta: true,
      fechaRegistro: true,
    },
    orderBy: { fechaRegistro: 'desc' },
  })
}

// Restablecimiento de contraseña de soporte (docs/diseno-desarrollo-nucleo.md
// §6.5). Cierra las sesiones del usuario afectado en la misma transacción que
// el cambio: una contraseña restablecida no debe dejar viva ninguna sesión
// abierta con la credencial anterior, igual que el flujo de recuperación por
// enlace cierra las sesiones al fijar la nueva (§6.5).
export async function restablecerContrasena(idUsuario: string, contrasena: string): Promise<void> {
  const existe = await prisma.usuario.findUnique({
    where: { idUsuario },
    select: { idUsuario: true },
  })
  if (!existe) throw new ErrorUsuarioNoEncontrado()

  const contrasenaHash = await hashContrasena(contrasena)

  await prisma.$transaction([
    prisma.usuario.update({ where: { idUsuario }, data: { contrasena: contrasenaHash } }),
    prisma.sesion.deleteMany({ where: { idUsuario } }),
  ])
}
