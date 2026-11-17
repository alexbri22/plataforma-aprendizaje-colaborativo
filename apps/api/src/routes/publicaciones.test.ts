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

// Publicación de proyectos: el entregable final de cada equipo, que sus
// integrantes suben en el cierre y ve toda la actividad.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const publicar = (idActividad: string, cookie: string, cuerpo: object) =>
  request(app)
    .put(`/api/actividades/${idActividad}/publicaciones`)
    .set('Cookie', cookie)
    .send(cuerpo)

const listar = (idActividad: string, cookie: string) =>
  request(app).get(`/api/actividades/${idActividad}/publicaciones`).set('Cookie', cookie)

async function dosEquipos(estado: 'desarrollo' | 'cierre' = 'cierre') {
  const e = await actividadEnFormacion(2)
  const alfa = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
  const beta = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
  await asignar(alfa, e.participantes[0].idMembresia, e.organizador.cookie)
  await asignar(beta, e.participantes[1].idMembresia, e.organizador.cookie)
  await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado } })
  return { ...e, alfa, beta }
}

describe('PUT /api/actividades/:id/publicaciones', () => {
  it('un integrante publica el proyecto de su equipo en el cierre, y luego lo corrige', async () => {
    const e = await dosEquipos()

    const creada = await publicar(e.id, e.participantes[0].cookie, {
      descripcion: '  Tesina sobre robótica  ',
      enlace: 'https://video.example.com/brazo',
    })
    expect(creada.status).toBe(200)
    expect(creada.body.publicacion).toMatchObject({
      idEquipo: e.alfa,
      descripcion: 'Tesina sobre robótica',
      enlace: 'https://video.example.com/brazo',
      archivo: null,
    })

    const corregida = await publicar(e.id, e.participantes[0].cookie, {
      descripcion: 'Tesina final',
    })
    expect(corregida.body.publicacion).toMatchObject({ descripcion: 'Tesina final', enlace: null })
    expect(await prisma.publicacionProyecto.count()).toBe(1)
    expect((await eventos(e.id, 'proyecto_publicado')).length).toBe(1)
    expect((await eventos(e.id, 'publicacion_modificada')).length).toBe(1)
  })

  it('valida la descripción y el enlace: 400', async () => {
    const e = await dosEquipos()
    expect((await publicar(e.id, e.participantes[0].cookie, { descripcion: ' ' })).status).toBe(400)
    expect(
      (
        await publicar(e.id, e.participantes[0].cookie, {
          descripcion: 'Algo',
          enlace: 'http://inseguro.example.com',
        })
      ).status,
    ).toBe(400)
  })

  it('antes del cierre no se publica: 409', async () => {
    const e = await dosEquipos('desarrollo')
    const respuesta = await publicar(e.id, e.participantes[0].cookie, { descripcion: 'Pronto' })
    expect(respuesta.status).toBe(409)
  })

  it('quien organiza no publica por un equipo: 403', async () => {
    const e = await dosEquipos()
    const respuesta = await publicar(e.id, e.organizador.cookie, { descripcion: 'Por ellos' })
    expect(respuesta.status).toBe(403)
  })
})

describe('archivo de la publicación', () => {
  it('se adjunta al proyecto propio y cualquier miembro lo descarga', async () => {
    const e = await dosEquipos()
    await publicar(e.id, e.participantes[0].cookie, { descripcion: 'Tesina' })

    const subida = await request(app)
      .put(`/api/actividades/${e.id}/publicaciones/archivo`)
      .set('Cookie', e.participantes[0].cookie)
      .set('Content-Type', 'application/pdf')
      .set('X-Nombre-Archivo', encodeURIComponent('tesina.pdf'))
      .send(Buffer.from('%PDF-1.4 contenido'))
    expect(subida.status).toBe(200)
    expect(subida.body.publicacion.archivo).toMatchObject({ nombre: 'tesina.pdf' })

    const descarga = await request(app)
      .get(`/api/actividades/${e.id}/publicaciones/${subida.body.publicacion.id}/archivo`)
      .set('Cookie', e.participantes[1].cookie)
    expect(descarga.status).toBe(200)
    expect(descarga.headers['content-type']).toContain('application/pdf')
  })

  it('sin proyecto publicado no se adjunta nada: 400', async () => {
    const e = await dosEquipos()
    const subida = await request(app)
      .put(`/api/actividades/${e.id}/publicaciones/archivo`)
      .set('Cookie', e.participantes[0].cookie)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from('%PDF-1.4'))
    expect(subida.status).toBe(400)
  })
})

describe('GET /api/actividades/:id/publicaciones', () => {
  it('cualquier miembro ve los proyectos de todos los equipos', async () => {
    const e = await dosEquipos()
    await publicar(e.id, e.participantes[0].cookie, { descripcion: 'De Alfa' })

    const deBeta = await listar(e.id, e.participantes[1].cookie)
    expect(deBeta.status).toBe(200)
    expect(deBeta.body.idMiEquipo).toBe(e.beta)
    expect(deBeta.body.publicaciones.map((p: { descripcion: string }) => p.descripcion)).toEqual([
      'De Alfa',
    ])

    const delOrganizador = await listar(e.id, e.organizador.cookie)
    expect(delOrganizador.body.idMiEquipo).toBeNull()
    expect(delOrganizador.body.equipos).toHaveLength(2)
  })
})
