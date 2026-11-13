import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import {
  app,
  actividadEnFormacion,
  asignar,
  eventos,
  idEquipoCreado,
  limpiarBD,
} from './equiposFixtures.js'

// Integración contra Postgres real (docs/diseno-desarrollo-nucleo.md §12.2).
// Cubre la bitácora guiada de nucleo §9.3: crear y editar con respuestas por
// clave de pregunta, la validación compartida en el servidor, quién escribe
// y quién lee (P-06), y el evento del historial de cada escritura.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const crearEntrada = (idActividad: string, cookie: string, respuestas: unknown) =>
  request(app)
    .post(`/api/actividades/${idActividad}/bitacora`)
    .set('Cookie', cookie)
    .send({ respuestas })

const editarEntrada = (idEntrada: string, cookie: string, respuestas: unknown) =>
  request(app).patch(`/api/bitacora/${idEntrada}`).set('Cookie', cookie).send({ respuestas })

const listarBitacora = (idActividad: string, cookie: string, idMembresia?: string) =>
  request(app)
    .get(
      `/api/actividades/${idActividad}/bitacora${idMembresia ? `?idMembresia=${idMembresia}` : ''}`,
    )
    .set('Cookie', cookie)

// Dos participantes con equipo, la actividad en desarrollo y la bitácora
// habilitada. El estado y la configuración se fijan directamente: la
// transición y la pantalla de configuración no son lo que se prueba aquí.
async function actividadConBitacora() {
  const e = await actividadEnFormacion(2)
  const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
  await asignar(idEquipo, e.participantes[0].idMembresia, e.organizador.cookie)
  await asignar(idEquipo, e.participantes[1].idMembresia, e.organizador.cookie)
  await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
  await prisma.configuracionFuncion.update({
    where: { idActividad_funcion: { idActividad: e.id, funcion: 'bitacora_individual' } },
    data: { estado: 'guiada' },
  })
  return { ...e, idEquipo }
}

describe('POST /api/actividades/:id/bitacora', () => {
  it('crea una entrada guiada con las respuestas recortadas, sin las vacías', async () => {
    const e = await actividadConBitacora()

    const respuesta = await crearEntrada(e.id, e.participantes[0].cookie, {
      duda_pendiente: '  ¿Cómo citamos las fuentes?  ',
      tareas_cumplidas: '',
      conocimientos_adquiridos: 'Dividir el trabajo por secciones.',
    })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.entrada).toMatchObject({
      idMembresia: e.participantes[0].idMembresia,
      respuestas: {
        conocimientos_adquiridos: 'Dividir el trabajo por secciones.',
        duda_pendiente: '¿Cómo citamos las fuentes?',
      },
    })
    expect(respuesta.body.entrada).not.toHaveProperty('contenido')
  })

  it('registra entrada_bitacora_creada con la primera respuesta como extracto', async () => {
    const e = await actividadConBitacora()
    const respuesta = await crearEntrada(e.id, e.participantes[0].cookie, {
      importancia_cooperar: 'Nadie termina solo.',
      tiempo_aprovechado: 'Sí, casi todo.',
    })
    expect(respuesta.status).toBe(201)

    const registrados = await eventos(e.id, 'entrada_bitacora_creada')
    expect(registrados).toHaveLength(1)
    expect(registrados[0]).toMatchObject({
      categoria: 'aportacion',
      idEntidad: respuesta.body.entrada.id,
      idUsuarioActor: e.participantes[0].idUsuario,
    })
    // La primera en el orden del catálogo, no en el de la petición.
    expect(registrados[0].datos).toMatchObject({
      extracto: 'Sí, casi todo.',
      idMembresia: e.participantes[0].idMembresia,
      idEquipo: e.idEquipo,
    })
  })

  it('rechaza una entrada sin respuestas o con una pregunta inventada: 400', async () => {
    const e = await actividadConBitacora()

    const vacia = await crearEntrada(e.id, e.participantes[0].cookie, { tareas_cumplidas: ' ' })
    expect(vacia.status).toBe(400)

    const inventada = await crearEntrada(e.id, e.participantes[0].cookie, { otra: 'x' })
    expect(inventada.status).toBe(400)

    // El formato anterior de texto libre ya no existe.
    const textoLibre = await request(app)
      .post(`/api/actividades/${e.id}/bitacora`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ contenido: 'Texto suelto' })
    expect(textoLibre.status).toBe(400)

    expect(await prisma.bitacora.count()).toBe(0)
  })

  it('quien organiza no escribe en la bitácora: 403', async () => {
    const e = await actividadConBitacora()
    const respuesta = await crearEntrada(e.id, e.organizador.cookie, {
      conocimientos_adquiridos: 'x',
    })
    expect(respuesta.status).toBe(403)
  })

  it('con la bitácora deshabilitada no se escribe: 409', async () => {
    const e = await actividadConBitacora()
    await prisma.configuracionFuncion.update({
      where: { idActividad_funcion: { idActividad: e.id, funcion: 'bitacora_individual' } },
      data: { estado: 'deshabilitada' },
    })
    const respuesta = await crearEntrada(e.id, e.participantes[0].cookie, {
      conocimientos_adquiridos: 'x',
    })
    expect(respuesta.status).toBe(409)
  })
})

describe('PATCH /api/bitacora/:id', () => {
  it('el autor reemplaza las respuestas; el historial conserva las anteriores', async () => {
    const e = await actividadConBitacora()
    const creada = await crearEntrada(e.id, e.participantes[0].cookie, {
      conocimientos_adquiridos: 'Primera versión',
      duda_pendiente: 'Una duda',
    })

    const editada = await editarEntrada(creada.body.entrada.id, e.participantes[0].cookie, {
      conocimientos_adquiridos: 'Segunda versión',
    })

    expect(editada.status).toBe(200)
    expect(editada.body.entrada.respuestas).toEqual({ conocimientos_adquiridos: 'Segunda versión' })

    const registrados = await eventos(e.id, 'entrada_bitacora_modificada')
    expect(registrados).toHaveLength(1)
    expect(registrados[0].datos).toMatchObject({
      antes: { conocimientos_adquiridos: 'Primera versión', duda_pendiente: 'Una duda' },
      despues: { conocimientos_adquiridos: 'Segunda versión' },
    })
  })

  it('las mismas respuestas en otro orden no son un cambio: no registra evento', async () => {
    const e = await actividadConBitacora()
    const creada = await crearEntrada(e.id, e.participantes[0].cookie, {
      conocimientos_adquiridos: 'a',
      duda_pendiente: 'b',
    })

    const editada = await editarEntrada(creada.body.entrada.id, e.participantes[0].cookie, {
      duda_pendiente: 'b ',
      conocimientos_adquiridos: 'a',
    })

    expect(editada.status).toBe(200)
    expect(await eventos(e.id, 'entrada_bitacora_modificada')).toHaveLength(0)
  })

  it('otra persona no edita la entrada, ni siquiera sabe que existe: 404', async () => {
    const e = await actividadConBitacora()
    const creada = await crearEntrada(e.id, e.participantes[0].cookie, {
      conocimientos_adquiridos: 'a',
    })

    const ajena = await editarEntrada(creada.body.entrada.id, e.participantes[1].cookie, {
      conocimientos_adquiridos: 'b',
    })
    expect(ajena.status).toBe(404)
  })

  it('rechaza dejar la entrada sin respuestas: 400', async () => {
    const e = await actividadConBitacora()
    const creada = await crearEntrada(e.id, e.participantes[0].cookie, {
      conocimientos_adquiridos: 'a',
    })

    const vacia = await editarEntrada(creada.body.entrada.id, e.participantes[0].cookie, {
      conocimientos_adquiridos: '',
    })
    expect(vacia.status).toBe(400)
  })
})

describe('GET /api/actividades/:id/bitacora', () => {
  it('quien organiza lee la bitácora de un participante; otro participante no (P-06)', async () => {
    const e = await actividadConBitacora()
    await crearEntrada(e.id, e.participantes[0].cookie, { aportacion_concreta: 'El índice' })

    const organizador = await listarBitacora(
      e.id,
      e.organizador.cookie,
      e.participantes[0].idMembresia,
    )
    expect(organizador.status).toBe(200)
    expect(organizador.body.entradas).toHaveLength(1)
    expect(organizador.body.entradas[0].respuestas).toEqual({ aportacion_concreta: 'El índice' })

    const companero = await listarBitacora(
      e.id,
      e.participantes[1].cookie,
      e.participantes[0].idMembresia,
    )
    expect(companero.status).toBe(403)
  })
})
