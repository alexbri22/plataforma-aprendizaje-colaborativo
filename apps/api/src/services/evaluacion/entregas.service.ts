import type { ArchivoEntrega, EntregaInstrumento } from '@prisma/client'
import type { EntregaDeInstrumento } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorInstrumentoNoEncontrado,
  ErrorValidacion,
} from '../../errores.js'
import { limpiarNombreArchivo, validarArchivoAdjunto } from '../../utilidades/archivos.js'
import { exigirAccion, type MembresiaActor } from '../actividades/actividades.service.js'
import { obtenerIdEquipoDeMembresia } from '../equipos/equipos.service.js'
import { registrarEvento } from '../historial/historial.service.js'
import type { ActividadParaRespuestas } from './respuestas.service.js'

// Entregas de las actividades externas (nucleo §10.1): con lo que quien
// participa marca como hecha una instancia de formato enlace. Este módulo es
// el único que lee y escribe `entregas_instrumento` y `archivos_entrega`.

const MENSAJE_FASE = 'Las actividades se entregan durante el desarrollo y el cierre.'

type FilaEntrega = EntregaInstrumento & {
  archivo: Pick<ArchivoEntrega, 'nombre' | 'tipo' | 'tamano'> | null
}

const CON_ARCHIVO = { archivo: { select: { nombre: true, tipo: true, tamano: true } } } as const

function aRespuesta(fila: FilaEntrega): EntregaDeInstrumento {
  return {
    id: fila.idEntrega,
    idInstrumento: fila.idInstrumento,
    idMembresia: fila.idMembresia,
    contenido: fila.contenido,
    enlace: fila.enlace,
    archivo: fila.archivo,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  }
}

async function actividadExterna(actividad: ActividadParaRespuestas, idInstrumento: string) {
  const instrumento = await prisma.instrumento.findFirst({
    where: { idInstrumento, aspecto: { componente: { idActividad: actividad.idActividad } } },
  })
  if (!instrumento) throw new ErrorInstrumentoNoEncontrado()
  if (instrumento.origen !== 'enlace') {
    throw new ErrorValidacion({ instrumento: 'Este instrumento no es una actividad externa.' })
  }
  return instrumento
}

// GET /api/actividades/{id}/instrumentos/{idInstrumento}/entregas: quien
// participa ve la suya; quien organiza o co-organiza, las de todos.
export async function listarEntregas(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
): Promise<EntregaDeInstrumento[]> {
  await actividadExterna(actividad, idInstrumento)
  const filas = await prisma.entregaInstrumento.findMany({
    where: {
      idInstrumento,
      ...(membresia.rol === 'participante' ? { idMembresia: membresia.idMembresia } : {}),
    },
    include: CON_ARCHIVO,
  })
  return filas.map(aRespuesta)
}

// PUT /api/actividades/{id}/instrumentos/{idInstrumento}/entrega: registra o
// corrige la entrega propia. Pide que la actividad ya tenga su enlace: sin
// él no hay nada que hacer fuera de la plataforma.
export async function guardarEntrega(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
  datos: { contenido: string; enlace: string | null },
  idUsuarioActor: string,
): Promise<EntregaDeInstrumento> {
  exigirAccion(membresia, 'responder_instrumento', actividad.estado, MENSAJE_FASE)
  const instrumento = await actividadExterna(actividad, idInstrumento)
  if (!instrumento.enlace) {
    throw new ErrorValidacion({
      instrumento: 'Quien organiza todavía no agrega el enlace de esta actividad.',
    })
  }

  const idEquipo = await obtenerIdEquipoDeMembresia(membresia.idMembresia)
  const clave = { idInstrumento, idMembresia: membresia.idMembresia }

  const fila = await prisma.$transaction(async (tx) => {
    const anterior = await tx.entregaInstrumento.findUnique({
      where: { idInstrumento_idMembresia: clave },
    })
    if (anterior && anterior.contenido === datos.contenido && anterior.enlace === datos.enlace) {
      return anterior
    }
    const guardada = await tx.entregaInstrumento.upsert({
      where: { idInstrumento_idMembresia: clave },
      create: { ...clave, ...datos },
      update: datos,
    })
    // Aportación privada, como las respuestas (historial.service).
    await registrarEvento(tx, {
      idActividad: actividad.idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: anterior ? 'entrega_modificada' : 'entrega_registrada',
      tipoEntidad: 'instrumento',
      idEntidad: idInstrumento,
      datos: {
        nombre: instrumento.nombre,
        idMembresia: membresia.idMembresia,
        ...(idEquipo ? { idEquipo } : {}),
        ...(anterior
          ? {
              antes: { contenido: anterior.contenido, enlace: anterior.enlace },
              despues: datos,
            }
          : { extracto: datos.contenido.slice(0, 140) }),
      },
      categoria: 'aportacion',
    })
    return guardada
  })

  return aRespuesta(
    await prisma.entregaInstrumento.findUniqueOrThrow({
      where: { idEntrega: fila.idEntrega },
      include: CON_ARCHIVO,
    }),
  )
}

async function entregaPropia(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
) {
  exigirAccion(membresia, 'responder_instrumento', actividad.estado, MENSAJE_FASE)
  await actividadExterna(actividad, idInstrumento)
  const entrega = await prisma.entregaInstrumento.findUnique({
    where: { idInstrumento_idMembresia: { idInstrumento, idMembresia: membresia.idMembresia } },
  })
  if (!entrega) {
    throw new ErrorValidacion({ entrega: 'Primero escribe tu entrega; luego adjunta el archivo.' })
  }
  return entrega
}

// PUT .../entrega/archivo: el archivo de la entrega propia, con las reglas de
// los adjuntos del espacio de equipo (utilidades/archivos.ts).
export async function guardarArchivoEntrega(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
  tipo: string,
  nombre: string,
  contenido: Buffer,
): Promise<EntregaDeInstrumento> {
  validarArchivoAdjunto(tipo, contenido)
  const entrega = await entregaPropia(actividad, membresia, idInstrumento)
  const datos = {
    contenido: new Uint8Array(contenido),
    tipo,
    nombre: limpiarNombreArchivo(nombre),
    tamano: contenido.length,
    subidoEn: new Date(),
  }
  await prisma.$transaction([
    prisma.archivoEntrega.upsert({
      where: { idEntrega: entrega.idEntrega },
      create: { idEntrega: entrega.idEntrega, ...datos },
      update: datos,
    }),
    prisma.entregaInstrumento.update({
      where: { idEntrega: entrega.idEntrega },
      data: { fechaActualizacion: new Date() },
    }),
  ])
  return aRespuesta(
    await prisma.entregaInstrumento.findUniqueOrThrow({
      where: { idEntrega: entrega.idEntrega },
      include: CON_ARCHIVO,
    }),
  )
}

export async function quitarArchivoEntrega(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
): Promise<EntregaDeInstrumento> {
  const entrega = await entregaPropia(actividad, membresia, idInstrumento)
  await prisma.archivoEntrega.deleteMany({ where: { idEntrega: entrega.idEntrega } })
  return aRespuesta(
    await prisma.entregaInstrumento.findUniqueOrThrow({
      where: { idEntrega: entrega.idEntrega },
      include: CON_ARCHIVO,
    }),
  )
}

// GET .../entregas/{idEntrega}/archivo: su autor o quien organiza.
export async function obtenerArchivoEntrega(
  actividad: ActividadParaRespuestas,
  membresia: MembresiaActor,
  idInstrumento: string,
  idEntrega: string,
): Promise<ArchivoEntrega> {
  const entrega = await prisma.entregaInstrumento.findFirst({
    where: {
      idEntrega,
      idInstrumento,
      instrumento: { aspecto: { componente: { idActividad: actividad.idActividad } } },
    },
    include: { archivo: true },
  })
  if (!entrega?.archivo) throw new ErrorInstrumentoNoEncontrado()
  if (membresia.rol === 'participante' && entrega.idMembresia !== membresia.idMembresia) {
    throw new ErrorAccionNoPermitida()
  }
  return entrega.archivo
}
