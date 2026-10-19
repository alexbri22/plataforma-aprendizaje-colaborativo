import type { Bitacora as FilaBitacora, EstadoActividad, Prisma } from '@prisma/client'
import { type EntradaBitacora } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorEntradaBitacoraNoEncontrada,
  ErrorFaseNoPermiteAccion,
  ErrorValidacion,
} from '../../errores.js'
import {
  buscarMembresiaConPermisos,
  exigirAccion,
  obtenerEstadoBitacoraIndividual,
  obtenerFaseDeActividad,
  type MembresiaActor,
} from '../actividades/actividades.service.js'
import { registrarComprobadorDeDatos } from '../actividades/cambiosDeFuncion.js'
import { obtenerIdEquipoDeMembresia } from '../equipos/equipos.service.js'
import { registrarEvento } from '../historial/historial.service.js'

// Bitácora individual (docs/diseno-desarrollo-nucleo.md §9.3): vinculada a
// la membresía y no al equipo. Este módulo es el único que lee y escribe
// `bitacoras`.

const MENSAJE_FASE = 'La bitácora no puede editarse en esta fase.'

function aRespuesta(fila: FilaBitacora): EntradaBitacora {
  return {
    id: fila.idEntrada,
    idMembresia: fila.idMembresia,
    contenido: fila.contenido,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  }
}

export interface ActividadParaBitacora {
  idActividad: string
  estado: EstadoActividad
}

// Quién puede leer la bitácora de otra persona (nucleo §9.3, P-06): el
// autor siempre puede la suya (eso no pasa por aquí); de otra, solo quien
// organiza o co-organiza con `leer_bitacoras`. Es una comprobación de
// permiso, no de fase (la lectura no se cierra al archivarse: general §7.4,
// "solo lectura para todos", no "sin lectura"), así que no pasa por
// autorizar()/exigirAccion como las escrituras de este módulo.
function puedeLeerBitacorasAjenas(membresia: MembresiaActor): boolean {
  if (membresia.rol === 'organizador') return true
  if (membresia.rol === 'co_organizador') {
    return membresia.permisos.some((p) => p.permiso === 'leer_bitacoras')
  }
  return false
}

// GET /api/actividades/{id}/bitacora (nucleo §9.4): sin idMembresiaObjetivo,
// las entradas propias del actor; con ella, las de otra persona, solo si
// puedeLeerBitacorasAjenas. Se verifica que la membresía objetivo sea de
// esta actividad: sin eso, un id de otra actividad filtraría su bitácora
// con el permiso de esta.
export async function listarBitacora(
  actividad: ActividadParaBitacora,
  membresiaActor: MembresiaActor,
  idMembresiaObjetivo: string | undefined,
): Promise<EntradaBitacora[]> {
  let idMembresia = membresiaActor.idMembresia

  if (idMembresiaObjetivo && idMembresiaObjetivo !== membresiaActor.idMembresia) {
    if (!puedeLeerBitacorasAjenas(membresiaActor)) throw new ErrorAccionNoPermitida()
    const objetivo = await prisma.membresia.findFirst({
      where: { idMembresia: idMembresiaObjetivo, idActividad: actividad.idActividad },
    })
    if (!objetivo) throw new ErrorValidacion({ idMembresia: 'No pertenece a esta actividad.' })
    idMembresia = idMembresiaObjetivo
  }

  const filas = await prisma.bitacora.findMany({
    where: { idMembresia },
    orderBy: { fechaCreacion: 'desc' },
  })
  return filas.map(aRespuesta)
}

// El cliente oculta el formulario cuando la función está deshabilitada
// (nucleo §4.3), pero eso no es la barrera de autorización (general §3.5):
// el servidor repite la comprobación contra la configuración de
// bitacora_individual, mismo criterio que crearElemento/editarElemento en
// elementos.service.ts para espacio_equipo.
async function exigirBitacoraHabilitada(idActividad: string): Promise<void> {
  const estado = await obtenerEstadoBitacoraIndividual(idActividad)
  if (estado !== 'habilitada') {
    throw new ErrorFaseNoPermiteAccion(
      'No puedes escribir en la bitácora: está deshabilitada en esta actividad.',
    )
  }
}

// POST /api/actividades/{id}/bitacora: solo quien participa (general §7.3,
// "Escribir en la bitácora individual propia" es "—" para organizador y
// co-organizador — ver ACCIONES_EXCLUSIVAS_DE_PARTICIPANTE en
// capacidades.ts). Sin límite de una por día (nucleo §9.3): cada llamada
// crea una entrada nueva.
export async function crearEntradaBitacora(
  actividad: ActividadParaBitacora,
  contenido: string,
  idUsuarioActor: string,
  membresiaActor: MembresiaActor,
): Promise<EntradaBitacora> {
  exigirAccion(membresiaActor, 'escribir_bitacora', actividad.estado, MENSAJE_FASE)
  await exigirBitacoraHabilitada(actividad.idActividad)

  // idEquipo del autor al momento de escribir (nucleo §5.5): el historial
  // acotado a un equipo filtra categoría aportación por datos.idEquipo, así
  // que sin esto el evento quedaría invisible ahí a pesar de ser del
  // integrante de ese equipo — mismo criterio que datosDestinoComentario.
  const idEquipoAutor = await obtenerIdEquipoDeMembresia(membresiaActor.idMembresia)

  const fila = await prisma.$transaction(async (tx) => {
    const creada = await tx.bitacora.create({
      data: { idMembresia: membresiaActor.idMembresia, contenido },
    })

    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'entrada_bitacora_creada',
      tipoEntidad: 'bitacora',
      idEntidad: creada.idEntrada,
      // nucleo §5.1 ("creación: identificación legible de lo creado"):
      // extracto, no el contenido completo. idMembresia: de quién es esta
      // bitácora — el cliente lo usa para construir el enlace de vuelta
      // (la propia o la de otra persona) sin otra consulta.
      datos: {
        extracto: contenido.slice(0, 140),
        idMembresia: membresiaActor.idMembresia,
        ...(idEquipoAutor ? { idEquipo: idEquipoAutor } : {}),
      },
      categoria: 'aportacion',
    })

    return creada
  })

  return aRespuesta(fila)
}

// Resuelve la entrada y verifica que el actor sea su autor; mismo criterio
// de 404 que ErrorElementoNoEncontrado (nucleo §3.3): una entrada ajena no
// se distingue de una que no existe.
async function contextoDeEntradaPropia(
  idEntrada: string,
  idUsuario: string,
): Promise<{ entrada: FilaBitacora; idActividad: string; membresiaActor: MembresiaActor }> {
  const entrada = await prisma.bitacora.findUnique({ where: { idEntrada } })
  if (!entrada) throw new ErrorEntradaBitacoraNoEncontrada()

  const membresiaDeLaEntrada = await prisma.membresia.findUnique({
    where: { idMembresia: entrada.idMembresia },
  })
  if (!membresiaDeLaEntrada || membresiaDeLaEntrada.idUsuario !== idUsuario) {
    throw new ErrorEntradaBitacoraNoEncontrada()
  }

  const membresiaActor = await buscarMembresiaConPermisos(
    idUsuario,
    membresiaDeLaEntrada.idActividad,
  )
  if (!membresiaActor) throw new ErrorEntradaBitacoraNoEncontrada()

  return { entrada, idActividad: membresiaDeLaEntrada.idActividad, membresiaActor }
}

// PATCH /api/bitacora/{id} (nucleo §9.4): el autor edita una entrada propia.
// Nucleo §9.4 no lista DELETE: no existe.
export async function editarEntradaBitacora(
  idEntrada: string,
  contenido: string,
  idUsuarioActor: string,
): Promise<EntradaBitacora> {
  const { entrada, idActividad, membresiaActor } = await contextoDeEntradaPropia(
    idEntrada,
    idUsuarioActor,
  )
  const fase = await obtenerFaseDeActividad(idActividad)
  exigirAccion(membresiaActor, 'escribir_bitacora', fase, MENSAJE_FASE)
  await exigirBitacoraHabilitada(idActividad)

  const idEquipoAutor = await obtenerIdEquipoDeMembresia(membresiaActor.idMembresia)

  const fila = await prisma.$transaction(async (tx) => {
    if (contenido === entrada.contenido) return entrada

    const actualizada = await tx.bitacora.update({ where: { idEntrada }, data: { contenido } })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'entrada_bitacora_modificada',
      tipoEntidad: 'bitacora',
      idEntidad: idEntrada,
      datos: {
        antes: entrada.contenido,
        despues: contenido,
        idMembresia: membresiaActor.idMembresia,
        ...(idEquipoAutor ? { idEquipo: idEquipoAutor } : {}),
      },
      categoria: 'aportacion',
    })

    return actualizada
  })

  return aRespuesta(fila)
}

// Punto de entrada de Comentarios a los datos de Bitácora (nucleo §1.2:
// "ningún módulo accede a los datos de otro directamente"). No expone la
// fila de Prisma, solo lo que comentarios.service.ts necesita para
// autorizar: a qué actividad pertenece la entrada y quién puede leerla.
export interface ContextoEntradaParaComentario {
  idActividad: string
  idMembresiaAutorEntrada: string
  membresiaActor: MembresiaActor
}

export async function contextoEntradaParaComentario(
  idEntrada: string,
  idUsuario: string,
): Promise<ContextoEntradaParaComentario> {
  const entrada = await prisma.bitacora.findUnique({ where: { idEntrada } })
  if (!entrada) throw new ErrorEntradaBitacoraNoEncontrada()

  const membresiaDeLaEntrada = await prisma.membresia.findUnique({
    where: { idMembresia: entrada.idMembresia },
  })
  if (!membresiaDeLaEntrada) throw new ErrorEntradaBitacoraNoEncontrada()

  const membresiaActor = await buscarMembresiaConPermisos(
    idUsuario,
    membresiaDeLaEntrada.idActividad,
  )
  if (!membresiaActor) throw new ErrorEntradaBitacoraNoEncontrada()

  return {
    idActividad: membresiaDeLaEntrada.idActividad,
    idMembresiaAutorEntrada: entrada.idMembresia,
    membresiaActor,
  }
}

// La visibilidad de un comentario sobre una entrada la hereda la entrada
// misma (concepto §5.3): quien puede leer la entrada puede leer lo que se
// comentó sobre ella, nada más.
export function puedeLeerEntrada(
  membresiaActor: MembresiaActor,
  idMembresiaAutorEntrada: string,
): boolean {
  return (
    membresiaActor.idMembresia === idMembresiaAutorEntrada ||
    puedeLeerBitacorasAjenas(membresiaActor)
  )
}

// Comprobador de P-17 (general §6.2) para la función `bitacora_individual`.
// Reemplaza al SIN_DATOS_POSIBLES provisional de cambiosDeFuncion.ts, mismo
// patrón que espacio_equipo en elementos.service.ts: si cualquier membresía
// de la actividad tiene entradas, deshabilitar la función ya habilitada se
// rechaza.
async function hayEntradasDeBitacora(
  tx: Prisma.TransactionClient,
  idActividad: string,
): Promise<boolean> {
  const alguna = await tx.bitacora.findFirst({
    where: { membresia: { idActividad } },
    select: { idEntrada: true },
  })
  return alguna !== null
}

registrarComprobadorDeDatos('bitacora_individual', async (tx, idActividad) =>
  (await hayEntradasDeBitacora(tx, idActividad))
    ? 'La bitácora individual ya tiene entradas: solo puede habilitarse, no deshabilitarse.'
    : null,
)
