import type { ElementoEspacioEquipo as FilaElemento, Prisma } from '@prisma/client'
import type { ElementoDeEspacioEquipo, ElementoEspacioEquipo } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorElementoNoEncontrado,
  ErrorFaseNoPermiteAccion,
} from '../../errores.js'
import {
  contextoEquipoParaSeguimiento,
  type ContextoEquipoParaSeguimiento,
} from '../equipos/equipos.service.js'
import {
  exigirAccion,
  obtenerEstadoEspacioEquipo,
  obtenerFaseDeActividad,
} from '../actividades/actividades.service.js'
import { registrarComprobadorDeDatos } from '../actividades/cambiosDeFuncion.js'
import { registrarEvento } from '../historial/historial.service.js'

// Contenido del espacio de equipo (docs/diseno-desarrollo-nucleo.md §9.1):
// metas, avances y recursos. Este módulo (Seguimiento) es el único que lee y
// escribe `elementos_espacio_equipo`; de equipos e integrantes solo conoce lo
// que expone equipos.service.ts, y de la fase de la actividad solo lo que
// expone actividades.service.ts (nucleo §1.2).

const MENSAJE_FASE = 'El espacio de equipo no puede editarse en esta fase.'

function aRespuesta(fila: FilaElemento, nombreAutor: string): ElementoDeEspacioEquipo {
  return {
    id: fila.idElemento,
    tipo: fila.tipoElemento,
    contenido: fila.contenido,
    idMembresiaAutor: fila.idMembresiaAutor,
    autor: nombreAutor,
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

// Autoriza la escritura y verifica el dato que la matriz de capacidades no
// conoce: que el actor integre este equipo (nucleo §9.1: "cualquier
// integrante puede crear, editar y eliminar cualquier elemento"). Vale para
// los tres roles por igual — organizar o co-organizar da por rol la acción
// usar_espacio_equipo (general §7.4), pero no pertenencia a un equipo
// concreto; sin integrarlo no hay espacio propio sobre el cual actuar
// (general §7.3, "ausencia de contexto"), así que exigirlo a todos por
// igual es lo que cierra el hueco de que alguien que no organiza su propio
// equipo escriba en el de otro con el solo permiso de su rol.
async function exigirEscrituraSobreEquipo(contexto: ContextoEquipoParaSeguimiento): Promise<void> {
  const estado = await obtenerFaseDeActividad(contexto.idActividad)
  exigirAccion(contexto.membresia, 'usar_espacio_equipo', estado, MENSAJE_FASE)
  if (!contexto.esIntegrante) throw new ErrorAccionNoPermitida()
}

// GET /api/equipos/{id}/elementos (nucleo §9.4): cualquier integrante lee su
// propio equipo; organizador y co-organizador leen cualquiera (general §7.3,
// "ver el espacio de cualquier equipo"). Un participante que no integra este
// equipo recibe el mismo 404 que si no existiera (§3.3).
export async function listarElementos(
  idEquipo: string,
  idUsuarioActor: string,
  tipo?: ElementoEspacioEquipo,
): Promise<ElementoDeEspacioEquipo[]> {
  const { membresia, esIntegrante } = await contextoEquipoParaSeguimiento(idEquipo, idUsuarioActor)
  if (membresia.rol === 'participante' && !esIntegrante) throw new ErrorElementoNoEncontrado()

  const filas = await prisma.elementoEspacioEquipo.findMany({
    where: { idEquipo, ...(tipo ? { tipoElemento: tipo } : {}) },
    orderBy: { fechaCreacion: 'asc' },
  })
  const autores = await nombresDeAutores([...new Set(filas.map((f) => f.idMembresiaAutor))])
  return filas.map((fila) => aRespuesta(fila, autores.get(fila.idMembresiaAutor) ?? ''))
}

// POST /api/equipos/{id}/elementos: cualquier integrante crea una meta, un
// avance o un recurso (nucleo §9.1: "es un espacio compartido y no una suma
// de espacios individuales").
export async function crearElemento(
  idEquipo: string,
  tipo: ElementoEspacioEquipo,
  contenido: string,
  idUsuarioActor: string,
): Promise<ElementoDeEspacioEquipo> {
  const contexto = await contextoEquipoParaSeguimiento(idEquipo, idUsuarioActor)
  await exigirEscrituraSobreEquipo(contexto)
  const { membresia } = contexto

  // El cliente oculta un elemento deshabilitado (nucleo §4.3), pero eso no
  // es la barrera de autorización (general §3.5): el servidor repite la
  // comprobación contra la configuración de espacio_equipo.
  const estadoEspacio = await obtenerEstadoEspacioEquipo(contexto.idActividad)
  if (!estadoEspacio || estadoEspacio[tipo] === 'deshabilitado') {
    throw new ErrorFaseNoPermiteAccion(
      `No puedes crear ${tipo}: está deshabilitado en esta actividad.`,
    )
  }

  const fila = await prisma.$transaction(async (tx) => {
    const creado = await tx.elementoEspacioEquipo.create({
      data: { idEquipo, tipoElemento: tipo, contenido, idMembresiaAutor: membresia.idMembresia },
    })

    await registrarEvento(tx, {
      idActividad: contexto.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'elemento_creado',
      tipoEntidad: 'elemento_espacio_equipo',
      idEntidad: creado.idElemento,
      // nucleo §5.1 ("creación: identificación legible de lo creado"): tipo y
      // primeras líneas, no el contenido completo. idEquipo: ver el
      // comentario en editarElemento, listarHistorial lo usa para P-10.
      datos: { tipo, extracto: contenido.slice(0, 140), idEquipo },
      categoria: 'aportacion',
    })

    return creado
  })

  const autores = await nombresDeAutores([membresia.idMembresia])
  return aRespuesta(fila, autores.get(membresia.idMembresia) ?? '')
}

async function cargarElementoConEquipo(idElemento: string): Promise<FilaElemento> {
  const fila = await prisma.elementoEspacioEquipo.findUnique({ where: { idElemento } })
  if (!fila) throw new ErrorElementoNoEncontrado()
  return fila
}

export interface ContextoElementoParaComentario extends ContextoEquipoParaSeguimiento {
  idEquipo: string
  tipoElemento: ElementoEspacioEquipo
}

// Punto de entrada de Comentarios a los datos de Seguimiento (nucleo §1.2:
// "ningún módulo accede a los datos de otro directamente"). Reutiliza
// exactamente el contexto de listarElementos: un comentario sobre un
// elemento hereda la visibilidad del elemento mismo (concepto §5.3, nucleo
// §10.4), así que la condición para leerlo es la misma que para leer el
// elemento — "participante que no integra este equipo" se trata igual que
// si el elemento no existiera (esIntegrante) — y la condición para
// escribirlo es la del permiso de comentar, que resuelve exigirAccion con
// la membresía que aquí se expone. idEquipo y tipoElemento viajan también:
// comentarios.service.ts los guarda en el evento del historial para poder
// construir el enlace de vuelta al elemento (`/equipos/{id}/{tipo}`) sin
// otra consulta, y para que el historial acotado a un equipo (nucleo §5.5)
// pueda incluir estos comentarios como propios de ese equipo.
export async function contextoElementoParaComentario(
  idElemento: string,
  idUsuario: string,
): Promise<ContextoElementoParaComentario> {
  const actual = await cargarElementoConEquipo(idElemento)
  const contexto = await contextoEquipoParaSeguimiento(actual.idEquipo, idUsuario)
  return { ...contexto, idEquipo: actual.idEquipo, tipoElemento: actual.tipoElemento }
}

// PATCH /api/elementos/{id}: cualquier integrante del equipo edita el
// contenido de cualquier elemento, no solo el que creó (nucleo §9.1).
export async function editarElemento(
  idElemento: string,
  contenido: string,
  idUsuarioActor: string,
): Promise<ElementoDeEspacioEquipo> {
  const actual = await cargarElementoConEquipo(idElemento)
  const contexto = await contextoEquipoParaSeguimiento(actual.idEquipo, idUsuarioActor)
  await exigirEscrituraSobreEquipo(contexto)

  // Mismo gate que crearElemento, repetido aquí y no solo ahí: la
  // configuración de espacio_equipo puede cambiar libremente durante la
  // formación (P-17 todavía no aplica, eso empieza en desarrollo), así que
  // un elemento creado cuando su tipo estaba habilitado puede quedar
  // deshabilitado después. Sin este gate, seguiría editable indefinidamente
  // pese a estar deshabilitado — solo crearlo quedaría bloqueado.
  const estadoEspacio = await obtenerEstadoEspacioEquipo(contexto.idActividad)
  if (!estadoEspacio || estadoEspacio[actual.tipoElemento] === 'deshabilitado') {
    throw new ErrorFaseNoPermiteAccion(
      `No puedes editar ${actual.tipoElemento}: está deshabilitado en esta actividad.`,
    )
  }

  const fila = await prisma.$transaction(async (tx) => {
    if (contenido === actual.contenido) return actual

    const actualizado = await tx.elementoEspacioEquipo.update({
      where: { idElemento },
      data: { contenido },
    })

    await registrarEvento(tx, {
      idActividad: contexto.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'elemento_modificado',
      tipoEntidad: 'elemento_espacio_equipo',
      idEntidad: idElemento,
      // idEquipo no es solo para mostrar: listarHistorial (P-10) lo usa para
      // acotar lo que un participante ve a su propio equipo. No hay de dónde
      // más sacarlo una vez eliminado el elemento (ver eliminarElemento).
      datos: {
        tipo: actual.tipoElemento,
        antes: actual.contenido,
        despues: contenido,
        idEquipo: actual.idEquipo,
      },
      categoria: 'aportacion',
    })

    return actualizado
  })

  const autores = await nombresDeAutores([fila.idMembresiaAutor])
  return aRespuesta(fila, autores.get(fila.idMembresiaAutor) ?? '')
}

// DELETE /api/elementos/{id}: el evento conserva el contenido íntegro, que es
// el único lugar donde sobrevive (nucleo §9.1, §5.1).
export async function eliminarElemento(idElemento: string, idUsuarioActor: string): Promise<void> {
  const actual = await cargarElementoConEquipo(idElemento)
  const contexto = await contextoEquipoParaSeguimiento(actual.idEquipo, idUsuarioActor)
  await exigirEscrituraSobreEquipo(contexto)

  // Mismo gate que editarElemento: ver el comentario ahí.
  const estadoEspacio = await obtenerEstadoEspacioEquipo(contexto.idActividad)
  if (!estadoEspacio || estadoEspacio[actual.tipoElemento] === 'deshabilitado') {
    throw new ErrorFaseNoPermiteAccion(
      `No puedes eliminar ${actual.tipoElemento}: está deshabilitado en esta actividad.`,
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.elementoEspacioEquipo.delete({ where: { idElemento } })

    await registrarEvento(tx, {
      idActividad: contexto.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'elemento_eliminado',
      tipoEntidad: 'elemento_espacio_equipo',
      idEntidad: idElemento,
      // idEquipo: ver el comentario en editarElemento. Aquí es el único
      // lugar donde sobrevive, porque la fila ya se borró arriba.
      datos: { tipo: actual.tipoElemento, contenido: actual.contenido, idEquipo: actual.idEquipo },
      categoria: 'aportacion',
    })
  })
}

// Comprobador de P-17 (general §6.2) para la función `espacio_equipo`.
// Granularidad de función, no de elemento, como el resto de
// COMPROBADORES_DE_DATOS: si cualquier equipo de la actividad tiene
// contenido en cualquiera de los tres, deshabilitar o cambiar de modo un
// elemento ya habilitado se rechaza.
async function hayContenidoEnEspacioEquipo(
  tx: Prisma.TransactionClient,
  idActividad: string,
): Promise<boolean> {
  const alguno = await tx.elementoEspacioEquipo.findFirst({
    where: { equipo: { idActividad } },
    select: { idElemento: true },
  })
  return alguno !== null
}

// Sustituye al SIN_DATOS_POSIBLES provisional de cambiosDeFuncion.ts ahora
// que este módulo existe (nucleo §9.1); ver ahí el porqué de la indirección
// en vez de una importación estática.
registrarComprobadorDeDatos('espacio_equipo', async (tx, idActividad) =>
  (await hayContenidoEnEspacioEquipo(tx, idActividad))
    ? 'El espacio de equipo ya tiene contenido: solo puede habilitarse, no deshabilitarse ni cambiar de modo.'
    : null,
)
