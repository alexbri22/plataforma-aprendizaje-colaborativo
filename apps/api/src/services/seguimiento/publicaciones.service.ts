import type { EstadoActividad } from '@prisma/client'
import type { PublicacionDeProyecto, PublicacionesDeActividad } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorElementoNoEncontrado, ErrorValidacion } from '../../errores.js'
import { limpiarNombreArchivo, validarArchivoAdjunto } from '../../utilidades/archivos.js'
import { exigirAccion, type MembresiaActor } from '../actividades/actividades.service.js'
import { listarEquipos, obtenerIdEquipoDeMembresia } from '../equipos/equipos.service.js'
import { registrarEvento } from '../historial/historial.service.js'

// Publicación de proyectos: el entregable final de cada equipo, uno por
// equipo, que sus integrantes suben o corrigen durante el cierre y que ve
// toda la actividad. La sección Producto del espacio de equipo sigue siendo
// el trabajo en curso; esto es lo que se entrega.

const MENSAJE_FASE = 'El proyecto se publica durante el cierre.'

export interface ActividadParaPublicaciones {
  idActividad: string
  estado: EstadoActividad
}

const CON_ARCHIVO = {
  archivo: { select: { nombre: true, tipo: true, tamano: true } },
  autor: { include: { usuario: { select: { nombre: true, apellidoPaterno: true } } } },
} as const

type FilaConArchivo = Awaited<ReturnType<typeof cargarPublicacion>>

function cargarPublicacion(idEquipo: string) {
  return prisma.publicacionProyecto.findUnique({ where: { idEquipo }, include: CON_ARCHIVO })
}

function aRespuesta(fila: NonNullable<FilaConArchivo>): PublicacionDeProyecto {
  return {
    id: fila.idPublicacion,
    idEquipo: fila.idEquipo,
    descripcion: fila.descripcion,
    enlace: fila.enlace,
    archivo: fila.archivo,
    autor: `${fila.autor.usuario.nombre} ${fila.autor.usuario.apellidoPaterno}`.trim(),
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  }
}

// GET /api/actividades/{id}/publicaciones: cualquier miembro ve las de todos
// los equipos (es una publicación para la actividad).
export async function listarPublicaciones(
  idActividad: string,
  membresia: MembresiaActor,
): Promise<PublicacionesDeActividad> {
  const { equipos } = await listarEquipos(idActividad, membresia.idMembresia)
  const filas = await prisma.publicacionProyecto.findMany({
    where: { idEquipo: { in: equipos.map((e) => e.id) } },
    include: CON_ARCHIVO,
  })
  const idMiEquipo =
    membresia.rol === 'participante'
      ? await obtenerIdEquipoDeMembresia(membresia.idMembresia)
      : null
  return {
    equipos: equipos.map((e) => ({ id: e.id, nombre: e.nombre })),
    publicaciones: filas.map(aRespuesta),
    idMiEquipo,
  }
}

async function equipoPropio(
  actividad: ActividadParaPublicaciones,
  membresia: MembresiaActor,
): Promise<string> {
  exigirAccion(membresia, 'publicar_proyecto', actividad.estado, MENSAJE_FASE)
  const idEquipo = await obtenerIdEquipoDeMembresia(membresia.idMembresia)
  if (!idEquipo) throw new ErrorValidacion({ equipo: 'No tienes equipo en esta actividad.' })
  return idEquipo
}

// PUT /api/actividades/{id}/publicaciones: publica o corrige el proyecto del
// propio equipo. Cualquier integrante puede hacerlo, como en su espacio.
export async function guardarPublicacion(
  actividad: ActividadParaPublicaciones,
  membresia: MembresiaActor,
  datos: { descripcion: string; enlace: string | null },
  idUsuarioActor: string,
): Promise<PublicacionDeProyecto> {
  const idEquipo = await equipoPropio(actividad, membresia)
  const anterior = await cargarPublicacion(idEquipo)

  await prisma.$transaction(async (tx) => {
    const fila = await tx.publicacionProyecto.upsert({
      where: { idEquipo },
      create: { idEquipo, ...datos, idMembresiaAutor: membresia.idMembresia },
      update: datos,
    })
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: anterior ? 'publicacion_modificada' : 'proyecto_publicado',
      tipoEntidad: 'publicacion_proyecto',
      idEntidad: fila.idPublicacion,
      datos: {
        idEquipo,
        ...(anterior ? { antes: anterior.descripcion } : {}),
        despues: datos.descripcion,
      },
      categoria: 'aportacion',
    })
  })

  return aRespuesta((await cargarPublicacion(idEquipo))!)
}

async function publicacionPropia(actividad: ActividadParaPublicaciones, membresia: MembresiaActor) {
  const idEquipo = await equipoPropio(actividad, membresia)
  const publicacion = await cargarPublicacion(idEquipo)
  if (!publicacion) {
    throw new ErrorValidacion({ archivo: 'Publica el proyecto antes de adjuntarle un archivo.' })
  }
  return publicacion
}

// PUT /api/actividades/{id}/publicaciones/archivo: el archivo del proyecto
// propio, con las reglas de los adjuntos del espacio de equipo.
export async function guardarArchivoPublicacion(
  actividad: ActividadParaPublicaciones,
  membresia: MembresiaActor,
  tipo: string,
  nombre: string,
  contenido: Buffer,
  idUsuarioActor: string,
): Promise<PublicacionDeProyecto> {
  validarArchivoAdjunto(tipo, contenido)
  const publicacion = await publicacionPropia(actividad, membresia)
  const nombreLimpio = limpiarNombreArchivo(nombre)
  const datos = {
    contenido: new Uint8Array(contenido),
    tipo,
    nombre: nombreLimpio,
    tamano: contenido.length,
    subidoEn: new Date(),
  }
  await prisma.$transaction(async (tx) => {
    await tx.archivoPublicacion.upsert({
      where: { idPublicacion: publicacion.idPublicacion },
      create: { idPublicacion: publicacion.idPublicacion, ...datos },
      update: datos,
    })
    await tx.publicacionProyecto.update({
      where: { idPublicacion: publicacion.idPublicacion },
      data: { fechaActualizacion: new Date() },
    })
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'publicacion_modificada',
      tipoEntidad: 'publicacion_proyecto',
      idEntidad: publicacion.idPublicacion,
      datos: {
        idEquipo: publicacion.idEquipo,
        archivoAntes: publicacion.archivo?.nombre ?? null,
        archivoDespues: nombreLimpio,
      },
      categoria: 'aportacion',
    })
  })
  return aRespuesta((await cargarPublicacion(publicacion.idEquipo))!)
}

// DELETE /api/actividades/{id}/publicaciones/archivo
export async function quitarArchivoPublicacion(
  actividad: ActividadParaPublicaciones,
  membresia: MembresiaActor,
  idUsuarioActor: string,
): Promise<PublicacionDeProyecto> {
  const publicacion = await publicacionPropia(actividad, membresia)
  if (publicacion.archivo) {
    await prisma.$transaction(async (tx) => {
      await tx.archivoPublicacion.delete({ where: { idPublicacion: publicacion.idPublicacion } })
      await registrarEvento(tx, {
        idActividad: actividad.idActividad,
        tipoActor: 'usuario',
        idUsuarioActor,
        tipoEvento: 'publicacion_modificada',
        tipoEntidad: 'publicacion_proyecto',
        idEntidad: publicacion.idPublicacion,
        datos: {
          idEquipo: publicacion.idEquipo,
          archivoAntes: publicacion.archivo?.nombre ?? null,
          archivoDespues: null,
        },
        categoria: 'aportacion',
      })
    })
  }
  return aRespuesta((await cargarPublicacion(publicacion.idEquipo))!)
}

// GET /api/actividades/{id}/publicaciones/{idPublicacion}/archivo: cualquier
// miembro de la actividad.
export async function obtenerArchivoPublicacion(idActividad: string, idPublicacion: string) {
  const archivo = await prisma.archivoPublicacion.findFirst({
    where: { idPublicacion, publicacion: { equipo: { idActividad } } },
  })
  if (!archivo) throw new ErrorElementoNoEncontrado()
  return archivo
}
