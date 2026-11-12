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

// Retroalimentación: comentarios de quien organiza sobre cómo trabaja un
// equipo en una sección de su espacio (o en general). Quién escribe, quién
// lee (cada equipo la suya) y el resumen que acompaña a quien organiza.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const escribir = (idEquipo: string, cookie: string, seccion: string, contenido: string) =>
  request(app)
    .post(`/api/equipos/${idEquipo}/retroalimentacion`)
    .set('Cookie', cookie)
    .send({ seccion, contenido })

const leer = (idActividad: string, cookie: string) =>
  request(app).get(`/api/actividades/${idActividad}/retroalimentacion`).set('Cookie', cookie)

// Dos equipos de un participante cada uno, ya en desarrollo.
async function dosEquiposEnDesarrollo() {
  const e = await actividadEnFormacion(2)
  const alfa = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
  const beta = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
  await asignar(alfa, e.participantes[0].idMembresia, e.organizador.cookie)
  await asignar(beta, e.participantes[1].idMembresia, e.organizador.cookie)
  await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
  return { ...e, alfa, beta }
}

describe('POST /api/equipos/:id/retroalimentacion', () => {
  it('quien organiza escribe sobre una sección o en general, y queda en el historial', async () => {
    const e = await dosEquiposEnDesarrollo()

    const metas = await escribir(e.alfa, e.organizador.cookie, 'metas', 'Metas claras.')
    const general = await escribir(e.alfa, e.organizador.cookie, 'general', 'Van bien.')

    expect(metas.status).toBe(201)
    expect(metas.body.comentario).toMatchObject({
      idEquipo: e.alfa,
      seccion: 'metas',
      contenido: 'Metas claras.',
    })
    expect(general.status).toBe(201)
    const escritos = await eventos(e.id, 'comentario_escrito')
    expect(escritos.map((ev) => ev.datos)).toEqual([
      expect.objectContaining({ tipoEntidadComentada: 'seccion_equipo', seccion: 'metas' }),
      expect.objectContaining({ tipoEntidadComentada: 'seccion_equipo', seccion: 'general' }),
    ])
  })

  it('rechaza una sección que no existe: 400', async () => {
    const e = await dosEquiposEnDesarrollo()
    const respuesta = await escribir(e.alfa, e.organizador.cookie, 'bitacora', 'No aplica.')
    expect(respuesta.status).toBe(400)
  })

  it('quien participa no escribe retroalimentación, ni a su propio equipo', async () => {
    const e = await dosEquiposEnDesarrollo()
    const respuesta = await escribir(e.alfa, e.participantes[0].cookie, 'metas', 'Yo mismo.')
    expect(respuesta.status).toBe(404)
  })

  it('no se escribe fuera del desarrollo y el cierre: 409', async () => {
    const e = await dosEquiposEnDesarrollo()
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'archivada' } })
    const respuesta = await escribir(e.alfa, e.organizador.cookie, 'metas', 'Tarde.')
    expect(respuesta.status).toBe(409)
  })
})

describe('GET /api/actividades/:id/retroalimentacion', () => {
  it('quien organiza ve la de todos los equipos y el resumen de cada sección', async () => {
    const e = await dosEquiposEnDesarrollo()
    await escribir(e.alfa, e.organizador.cookie, 'metas', 'Metas claras.')
    await escribir(e.beta, e.organizador.cookie, 'general', 'Organícense mejor.')
    const meta = await request(app)
      .post(`/api/equipos/${e.alfa}/elementos`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ tipo: 'metas', contenido: 'Terminar el prototipo' })
    await request(app)
      .post(`/api/elementos/${meta.body.elemento.id}/comentarios`)
      .set('Cookie', e.organizador.cookie)
      .send({ contenido: 'Ponle fecha.' })

    const respuesta = await leer(e.id, e.organizador.cookie)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.equipos.map((eq: { nombre: string }) => eq.nombre)).toEqual([
      'Alfa',
      'Beta',
    ])
    expect(respuesta.body.retroalimentacion).toHaveLength(2)
    expect(respuesta.body.resumen).toEqual([
      { idEquipo: e.alfa, seccion: 'metas', elementos: 1, comentarios: 1 },
    ])
  })

  it('quien participa ve solo la de su equipo, sin resumen', async () => {
    const e = await dosEquiposEnDesarrollo()
    await escribir(e.alfa, e.organizador.cookie, 'metas', 'Para Alfa.')
    await escribir(e.beta, e.organizador.cookie, 'metas', 'Para Beta.')

    const respuesta = await leer(e.id, e.participantes[0].cookie)

    expect(respuesta.body.equipos).toEqual([{ id: e.alfa, nombre: 'Alfa' }])
    expect(respuesta.body.retroalimentacion.map((r: { contenido: string }) => r.contenido)).toEqual(
      ['Para Alfa.'],
    )
    expect(respuesta.body.resumen).toEqual([])
  })
})
