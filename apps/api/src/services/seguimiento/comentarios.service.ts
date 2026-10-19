import type { Comentario as FilaComentario } from '@prisma/client'
import { type Comentario, type TipoEntidadComentario } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorComentarioNoEncontrado,
  ErrorElementoNoEncontrado,
} from '../../errores.js'
import {
  exigirAccion,
  obtenerFaseDeActividad,
  type MembresiaActor,
} from '../actividades/actividades.service.js'
import { obtenerIdEquipoDeMembresia } from '../equipos/equipos.service.js'
import { registrarEvento } from '../historial/historial.service.js'
import { contextoElementoParaComentario } from './elementos.service.js'
import { contextoEntradaParaComentario, puedeLeerEntrada } from './bitacora.service.js'

// Comentarios (docs/diseno-desarrollo-nucleo.md §10.4): un comentario apunta
// a un elemento del espacio de equipo o a una entrada de bitácora, nunca a
// un equipo ni a una persona en abstracto. La visibilidad no es una regla
// propia: la hereda la entidad referida, así que este módulo nunca decide
// "quién ve esto" por su cuenta — pregunta a Seguimiento (vía
// contextoElementoParaComentario / contextoEntradaParaComentario) y repite
// la misma condición que esos módulos usan para la entidad misma.

const MENSAJE_FASE = 'Los comentarios no pueden escribirse ni editarse en esta fase.'

function aRespuesta(fila: FilaComentario, nombreAutor: string): Comentario {
  return {
    id: fila.idComentario,
    idMembresiaAutor: fila.idMembresiaAutor,
    autor: nombreAutor,
    tipoEntidad: fila.tipoEntidad,
    idEntidad: fila.idEntidad,
    contenido: fila.contenido,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  }
}

async function nombresDeAutores(idsMembresia: string[]): Promise<Map<string, string>> {
  const membresias = await prisma.membresia.findMany({
    where: { idMembresia: { in: idsMembresia } },
    include: { usuario: { select: { nombre: true, apellidoPaterno: true } } },
  })
  return new Map(
    membresias.map((m) => [
      m.idMembresia,
      `${m.usuario.nombre} ${m.usuario.apellidoPaterno}`.trim(),
    ]),
  )
}

async function listarYResolverAutores(
  tipoEntidad: TipoEntidadComentario,
  idEntidad: string,
): Promise<Comentario[]> {
  const filas = await prisma.comentario.findMany({
    where: { tipoEntidad, idEntidad },
    orderBy: { fechaCreacion: 'asc' },
  })
  const autores = await nombresDeAutores([...new Set(filas.map((f) => f.idMembresiaAutor))])
  return filas.map((f) => aRespuesta(f, autores.get(f.idMembresiaAutor) ?? ''))
}

// Lo que hace falta para construir, del lado del cliente, el enlace de
// vuelta a lo comentado y para que el historial acotado a un equipo (nucleo
// §5.5) reconozca un comentario sobre un elemento como propio de ese
// equipo. Se resuelve por separado del contexto de autorización porque
// editarComentario no pasa por contextoElementoParaComentario /
// contextoEntradaParaComentario (no necesita volver a decidir quién puede
// comentar, solo confirmar que el autor sigue siendo quien edita) y aun así
// necesita los mismos datos. Devuelve {} si la entidad referida ya no
// existe: el evento se escribe igual, solo sin el atajo de navegación.
async function datosDestinoComentario(
  tipoEntidad: TipoEntidadComentario,
  idEntidad: string,
): Promise<Record<string, unknown>> {
  if (tipoEntidad === 'elemento_espacio_equipo') {
    const elemento = await prisma.elementoEspacioEquipo.findUnique({
      where: { idElemento: idEntidad },
    })
    return elemento ? { idEquipo: elemento.idEquipo, tipoElemento: elemento.tipoElemento } : {}
  }
  const entrada = await prisma.bitacora.findUnique({ where: { idEntrada: idEntidad } })
  if (!entrada) return {}
  const idEquipo = await obtenerIdEquipoDeMembresia(entrada.idMembresia)
  return { idMembresia: entrada.idMembresia, ...(idEquipo ? { idEquipo } : {}) }
}

async function crearYRegistrar(
  idActividad: string,
  membresiaAutor: MembresiaActor,
  tipoEntidad: TipoEntidadComentario,
  idEntidad: string,
  contenido: string,
  idUsuarioActor: string,
): Promise<Comentario> {
  const datosDestino = await datosDestinoComentario(tipoEntidad, idEntidad)

  const fila = await prisma.$transaction(async (tx) => {
    const creado = await tx.comentario.create({
      data: { idMembresiaAutor: membresiaAutor.idMembresia, tipoEntidad, idEntidad, contenido },
    })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'comentario_escrito',
      tipoEntidad: 'comentario',
      idEntidad: creado.idComentario,
      // categoria evaluación (nucleo §5.2): visible para quien organiza con
      // independencia de que el comentario mismo sea legible por el equipo
      // o por el autor de la bitácora (nucleo §10.4) — ver el comentario en
      // el elemento y ver el evento en el historial son dos cosas distintas.
      datos: {
        tipoEntidadComentada: tipoEntidad,
        idEntidadComentada: idEntidad,
        extracto: contenido.slice(0, 140),
        ...datosDestino,
      },
      categoria: 'evaluacion',
    })

    return creado
  })

  const autores = await nombresDeAutores([membresiaAutor.idMembresia])
  return aRespuesta(fila, autores.get(membresiaAutor.idMembresia) ?? '')
}

// GET /api/elementos/{id}/comentarios (nucleo §9.4, §10.4): la visibilidad
// es la del elemento mismo — cualquier integrante de su equipo, u
// organizador/co-organizador (general §7.3). Mismo 404 que listarElementos
// para quien no es miembro o es un participante ajeno al equipo.
export async function listarComentariosDeElemento(
  idElemento: string,
  idUsuario: string,
): Promise<Comentario[]> {
  const { membresia, esIntegrante } = await contextoElementoParaComentario(idElemento, idUsuario)
  if (membresia.rol === 'participante' && !esIntegrante) throw new ErrorElementoNoEncontrado()
  return listarYResolverAutores('elemento_espacio_equipo', idElemento)
}

// POST /api/elementos/{id}/comentarios: organizador o co-organizador con
// `calificar_y_comentar` (general §7.3). No exige ser integrante del
// equipo: comentar es una capacidad de quien organiza sobre cualquier
// equipo, no sobre el propio.
export async function crearComentarioSobreElemento(
  idElemento: string,
  contenido: string,
  idUsuarioActor: string,
): Promise<Comentario> {
  const { idActividad, membresia } = await contextoElementoParaComentario(
    idElemento,
    idUsuarioActor,
  )
  const fase = await obtenerFaseDeActividad(idActividad)
  exigirAccion(membresia, 'comentar', fase, MENSAJE_FASE)

  return crearYRegistrar(
    idActividad,
    membresia,
    'elemento_espacio_equipo',
    idElemento,
    contenido,
    idUsuarioActor,
  )
}

// GET /api/bitacora/{id}/comentarios: la visibilidad es la de la entrada
// misma — su autor, u organizador/co-organizador con `leer_bitacoras`
// (P-06). La bitácora es privada: un comentario sobre ella no puede ser más
// visible que ella (concepto §5.3).
export async function listarComentariosDeEntrada(
  idEntrada: string,
  idUsuario: string,
): Promise<Comentario[]> {
  const contexto = await contextoEntradaParaComentario(idEntrada, idUsuario)
  if (!puedeLeerEntrada(contexto.membresiaActor, contexto.idMembresiaAutorEntrada)) {
    throw new ErrorAccionNoPermitida()
  }
  return listarYResolverAutores('bitacora', idEntrada)
}

// POST /api/bitacora/{id}/comentarios: organizador o co-organizador con
// `calificar_y_comentar`, igual que sobre un elemento.
export async function crearComentarioSobreEntrada(
  idEntrada: string,
  contenido: string,
  idUsuarioActor: string,
): Promise<Comentario> {
  const contexto = await contextoEntradaParaComentario(idEntrada, idUsuarioActor)
  const fase = await obtenerFaseDeActividad(contexto.idActividad)
  exigirAccion(contexto.membresiaActor, 'comentar', fase, MENSAJE_FASE)

  return crearYRegistrar(
    contexto.idActividad,
    contexto.membresiaActor,
    'bitacora',
    idEntrada,
    contenido,
    idUsuarioActor,
  )
}

// PATCH /api/comentarios/{id} (nucleo §10.4): solo el autor, mientras la
// actividad no esté archivada. Reusa la acción 'comentar' para ese gate de
// fase y para repetir la comprobación del permiso con el que se escribió
// (si se le revocó calificar_y_comentar desde entonces, tampoco puede
// editar). Mismo 404 que ErrorElementoNoEncontrado para quien no es el
// autor: no se distingue de que el comentario no existe (nucleo §3.3).
export async function editarComentario(
  idComentario: string,
  contenido: string,
  idUsuarioActor: string,
): Promise<Comentario> {
  const comentario = await prisma.comentario.findUnique({ where: { idComentario } })
  if (!comentario) throw new ErrorComentarioNoEncontrado()

  const membresiaAutor = await prisma.membresia.findUnique({
    where: { idMembresia: comentario.idMembresiaAutor },
    include: { permisos: true },
  })
  if (!membresiaAutor || membresiaAutor.idUsuario !== idUsuarioActor) {
    throw new ErrorComentarioNoEncontrado()
  }

  const fase = await obtenerFaseDeActividad(membresiaAutor.idActividad)
  exigirAccion(membresiaAutor, 'comentar', fase, MENSAJE_FASE)
  const datosDestino = await datosDestinoComentario(comentario.tipoEntidad, comentario.idEntidad)

  const fila = await prisma.$transaction(async (tx) => {
    if (contenido === comentario.contenido) return comentario

    const actualizado = await tx.comentario.update({
      where: { idComentario },
      data: { contenido },
    })

    await registrarEvento(tx, {
      idActividad: membresiaAutor.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'comentario_modificado',
      tipoEntidad: 'comentario',
      idEntidad: idComentario,
      datos: { antes: comentario.contenido, despues: contenido, ...datosDestino },
      categoria: 'evaluacion',
    })

    return actualizado
  })

  const autores = await nombresDeAutores([membresiaAutor.idMembresia])
  return aRespuesta(fila, autores.get(membresiaAutor.idMembresia) ?? '')
}
