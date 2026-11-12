import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import { app, actividadEnFormacion, asignar, idEquipoCreado, limpiarBD } from './equiposFixtures.js'

// Planeación y Producto (modelo ABPCL) y el enlace y el archivo opcionales
// de cada elemento del espacio de equipo.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const PDF = Buffer.from('%PDF-1.4 prueba')

// Alfa con dos participantes en desarrollo; el tercero queda en Beta.
async function escenario() {
  const e = await actividadEnFormacion(3)
  const alfa = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
  const beta = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
  await asignar(alfa, e.participantes[0].idMembresia, e.organizador.cookie)
  await asignar(alfa, e.participantes[1].idMembresia, e.organizador.cookie)
  await asignar(beta, e.participantes[2].idMembresia, e.organizador.cookie)
  await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
  return { ...e, alfa, beta }
}

const crear = (idEquipo: string, cookie: string, cuerpo: Record<string, unknown>) =>
  request(app).post(`/api/equipos/${idEquipo}/elementos`).set('Cookie', cookie).send(cuerpo)

const subir = (idElemento: string, cookie: string, tipo: string, contenido: Buffer) =>
  request(app)
    .put(`/api/elementos/${idElemento}/archivo`)
    .set('Cookie', cookie)
    .set('Content-Type', tipo)
    .set('X-Nombre-Archivo', encodeURIComponent('Reporte final ñ.pdf'))
    .send(contenido)

describe('Planeación y Producto', () => {
  it('se crean igual que una meta', async () => {
    const e = await escenario()
    for (const tipo of ['planeacion', 'producto']) {
      const r = await crear(e.alfa, e.participantes[0].cookie, { tipo, contenido: 'Algo' })
      expect(r.status).toBe(201)
      expect(r.body.elemento).toMatchObject({ tipo, enlace: null, archivo: null })
    }
  })
})

describe('enlace de un elemento', () => {
  it('guarda un enlace https y lo conserva si la edición no lo menciona', async () => {
    const e = await escenario()
    const creado = await crear(e.alfa, e.participantes[0].cookie, {
      tipo: 'recursos',
      contenido: 'Guía',
      enlace: 'https://drive.google.com/x',
    })
    expect(creado.body.elemento.enlace).toBe('https://drive.google.com/x')

    const editado = await request(app)
      .patch(`/api/elementos/${creado.body.elemento.id}`)
      .set('Cookie', e.participantes[1].cookie)
      .send({ contenido: 'Guía revisada' })
    expect(editado.body.elemento.enlace).toBe('https://drive.google.com/x')

    const sinEnlace = await request(app)
      .patch(`/api/elementos/${creado.body.elemento.id}`)
      .set('Cookie', e.participantes[1].cookie)
      .send({ contenido: 'Guía revisada', enlace: null })
    expect(sinEnlace.body.elemento.enlace).toBeNull()
  })

  it('rechaza un enlace que no es https', async () => {
    const e = await escenario()
    const r = await crear(e.alfa, e.participantes[0].cookie, {
      tipo: 'recursos',
      contenido: 'Guía',
      enlace: 'http://inseguro.com',
    })
    expect(r.status).toBe(400)
    expect(r.body.detallePorCampo).toEqual({
      enlace: 'Debe ser un enlace completo que empiece con https://',
    })
  })
})

describe('archivo de un elemento', () => {
  async function conElemento() {
    const e = await escenario()
    const r = await crear(e.alfa, e.participantes[0].cookie, { tipo: 'recursos', contenido: 'x' })
    return { ...e, idElemento: r.body.elemento.id as string }
  }

  it('lo sube un integrante y lo descargan su equipo y quien organiza', async () => {
    const e = await conElemento()

    const subido = await subir(e.idElemento, e.participantes[0].cookie, 'application/pdf', PDF)
    expect(subido.status).toBe(200)
    expect(subido.body.elemento.archivo).toEqual({
      nombre: 'Reporte final ñ.pdf',
      tipo: 'application/pdf',
      tamano: PDF.length,
    })

    for (const cookie of [e.participantes[1].cookie, e.organizador.cookie]) {
      const descarga = await request(app)
        .get(`/api/elementos/${e.idElemento}/archivo`)
        .set('Cookie', cookie)
        .buffer(true)
      expect(descarga.status).toBe(200)
      expect(descarga.headers['content-type']).toMatch('application/pdf')
      expect(descarga.headers['cache-control']).toBe('private, no-store')
    }
  })

  it('quien participa en otro equipo no puede descargarlo', async () => {
    const e = await conElemento()
    await subir(e.idElemento, e.participantes[0].cookie, 'application/pdf', PDF)

    await request(app)
      .get(`/api/elementos/${e.idElemento}/archivo`)
      .set('Cookie', e.participantes[2].cookie)
      .expect(404)
  })

  it('rechaza un archivo que no corresponde a su tipo, o un tipo no admitido', async () => {
    const e = await conElemento()

    const falso = await subir(e.idElemento, e.participantes[0].cookie, 'image/png', PDF)
    expect(falso.status).toBe(400)
    expect(falso.body.codigo).toBe('archivo_invalido')

    const zip = await subir(e.idElemento, e.participantes[0].cookie, 'application/zip', PDF)
    expect(zip.status).toBe(400)
  })

  it('quitarlo deja el elemento sin archivo y lo registra en el historial', async () => {
    const e = await conElemento()
    await subir(e.idElemento, e.participantes[0].cookie, 'application/pdf', PDF)

    const r = await request(app)
      .delete(`/api/elementos/${e.idElemento}/archivo`)
      .set('Cookie', e.participantes[1].cookie)
    expect(r.status).toBe(200)
    expect(r.body.elemento.archivo).toBeNull()

    const eventos = await prisma.historial.findMany({
      where: { idEntidad: e.idElemento, tipoEvento: 'elemento_modificado' },
      orderBy: { fecha: 'asc' },
    })
    expect(eventos.map((ev) => ev.datos)).toMatchObject([
      { archivoAntes: null, archivoDespues: 'Reporte final ñ.pdf' },
      { archivoAntes: 'Reporte final ñ.pdf', archivoDespues: null },
    ])
  })

  it('eliminar el elemento borra también su archivo', async () => {
    const e = await conElemento()
    await subir(e.idElemento, e.participantes[0].cookie, 'application/pdf', PDF)

    await request(app)
      .delete(`/api/elementos/${e.idElemento}`)
      .set('Cookie', e.participantes[0].cookie)
      .expect(204)
    expect(await prisma.archivoElemento.count({ where: { idElemento: e.idElemento } })).toBe(0)
  })
})
