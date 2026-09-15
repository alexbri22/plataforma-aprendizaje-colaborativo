import type { CategoriaInsignia, NivelEstudios } from '@plataforma/shared'
import { MAX_BYTES_FOTO_PERFIL, esTipoFotoPerfil } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorFotoInvalida, ErrorUsuarioNoEncontrado, ErrorValidacion } from '../../errores.js'
import { acumuladoDeUsuario } from '../insignias/insignias.service.js'
import { hashContrasena, verificarContrasena } from './contrasena.js'
import { INCLUIR_FOTO, aUsuarioPublico, type UsuarioPublico } from './cuentas.service.js'
import type { CambioContrasenaValidado, DatosPerfilValidados } from './validacion.js'

/*
 * Perfil propio y perfil básico de otro usuario (docs/diseno-desarrollo-nucleo.md
 * §6.3). Es el único lugar del núcleo que depende de otro subsistema: los
 * rangos salen del acumulado que calcula Insignias (§1.3, "la única
 * dependencia en sentido inverso").
 */

export type Acumulado = Partial<Record<CategoriaInsignia, number>>

export interface PerfilPropio extends UsuarioPublico {
  nivelEstudios: NivelEstudios
  institucionEducativa: string
  acumulado: Acumulado
}

/** Lo que otro usuario con sesión ve: nombre, foto y rangos. Ni correo ni
 * institución (§6.3: "el correo nunca se muestra"). */
export interface PerfilBasico {
  idUsuario: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  fotoUrl: string | null
  acumulado: Acumulado
}

export async function obtenerPerfilPropio(idUsuario: string): Promise<PerfilPropio> {
  const usuario = await prisma.usuario.findUnique({
    where: { idUsuario },
    include: INCLUIR_FOTO,
  })
  if (!usuario) throw new ErrorUsuarioNoEncontrado()

  return {
    ...aUsuarioPublico(usuario),
    nivelEstudios: usuario.nivelEstudios,
    institucionEducativa: usuario.institucionEducativa,
    acumulado: await acumuladoDeUsuario(idUsuario),
  }
}

export async function obtenerPerfilBasico(idUsuario: string): Promise<PerfilBasico> {
  const usuario = await prisma.usuario.findUnique({
    where: { idUsuario },
    include: INCLUIR_FOTO,
  })
  if (!usuario) throw new ErrorUsuarioNoEncontrado()

  const publico = aUsuarioPublico(usuario)
  return {
    idUsuario: publico.idUsuario,
    nombre: publico.nombre,
    apellidoPaterno: publico.apellidoPaterno,
    apellidoMaterno: publico.apellidoMaterno,
    fotoUrl: publico.fotoUrl,
    acumulado: await acumuladoDeUsuario(idUsuario),
  }
}

export async function actualizarDatosPerfil(
  idUsuario: string,
  datos: DatosPerfilValidados,
): Promise<UsuarioPublico> {
  const usuario = await prisma.usuario.update({
    where: { idUsuario },
    data: datos,
    include: INCLUIR_FOTO,
  })
  return aUsuarioPublico(usuario)
}

/**
 * Cambia la contraseña exigiendo la anterior y cierra las demás sesiones del
 * usuario (docs/diseno-desarrollo-nucleo.md §3.2): quien cambia la contraseña
 * porque sospecha que alguien más la tiene necesita que ese alguien quede
 * fuera, y la sesión desde la que se hace el cambio es la única que se sabe
 * legítima.
 */
export async function cambiarContrasena(
  idUsuario: string,
  idSesionActual: string,
  cambio: CambioContrasenaValidado,
): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { idUsuario } })
  if (!usuario) throw new ErrorUsuarioNoEncontrado()

  if (!(await verificarContrasena(usuario.contrasena, cambio.contrasenaActual))) {
    throw new ErrorValidacion({ contrasenaActual: 'La contraseña actual no es correcta.' })
  }

  const contrasena = await hashContrasena(cambio.contrasenaNueva)
  await prisma.$transaction([
    prisma.usuario.update({ where: { idUsuario }, data: { contrasena } }),
    prisma.sesion.deleteMany({ where: { idUsuario, NOT: { id: idSesionActual } } }),
  ])
}

// Firmas de los tres formatos admitidos. El tipo declarado en Content-Type lo
// pone el cliente; los primeros bytes no, y son los que decide el navegador
// que después la muestre.
function firmaCoincide(tipo: string, contenido: Buffer): boolean {
  switch (tipo) {
    case 'image/jpeg':
      return contenido.length > 3 && contenido[0] === 0xff && contenido[1] === 0xd8
    case 'image/png':
      return contenido
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/webp':
      return (
        contenido.length > 12 &&
        contenido.subarray(0, 4).toString('ascii') === 'RIFF' &&
        contenido.subarray(8, 12).toString('ascii') === 'WEBP'
      )
    default:
      return false
  }
}

export async function guardarFoto(
  idUsuario: string,
  tipo: string,
  contenido: Buffer,
): Promise<UsuarioPublico> {
  if (!esTipoFotoPerfil(tipo)) {
    throw new ErrorFotoInvalida('La foto debe ser JPEG, PNG o WebP.')
  }
  if (contenido.length === 0) throw new ErrorFotoInvalida('La foto llegó vacía.')
  if (contenido.length > MAX_BYTES_FOTO_PERFIL) {
    throw new ErrorFotoInvalida('La foto pesa más de lo permitido.')
  }
  if (!firmaCoincide(tipo, contenido)) {
    throw new ErrorFotoInvalida('El archivo no es una imagen del tipo indicado.')
  }

  // Prisma 7 tipa Bytes como Uint8Array sobre un ArrayBuffer propio; un
  // Buffer puede compartir memoria con otros, así que se copia.
  const bytes = new Uint8Array(contenido.byteLength)
  bytes.set(contenido)

  const actualizadaEn = new Date()
  await prisma.fotoDePerfil.upsert({
    where: { idUsuario },
    create: { idUsuario, tipo, contenido: bytes, actualizadaEn },
    update: { tipo, contenido: bytes, actualizadaEn },
  })
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { idUsuario },
    include: INCLUIR_FOTO,
  })
  return aUsuarioPublico(usuario)
}

export async function quitarFoto(idUsuario: string): Promise<UsuarioPublico> {
  await prisma.fotoDePerfil.deleteMany({ where: { idUsuario } })
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { idUsuario },
    include: INCLUIR_FOTO,
  })
  return aUsuarioPublico(usuario)
}

export async function obtenerFoto(
  idUsuario: string,
): Promise<{ tipo: string; contenido: Buffer; actualizadaEn: Date } | null> {
  const foto = await prisma.fotoDePerfil.findUnique({ where: { idUsuario } })
  if (!foto) return null
  return {
    tipo: foto.tipo,
    contenido: Buffer.from(foto.contenido),
    actualizadaEn: foto.actualizadaEn,
  }
}
