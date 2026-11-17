import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import { app, actividadEnFormacion, asignar, idEquipoCreado, limpiarBD } from './equiposFixtures.js'

// Lo que cambió en esta ronda alrededor del desarrollo: un calendario de
// revisiones por elemento, lo entregado en cada periodo (Operación de la
// planeación), el avance de los instrumentos, corregir registros solo el
// mismo día, y calificaciones que el participante ve hasta el cierre.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const HOY = new Date()
const dia = (desplazamiento: number) => {
  const d = new Date(Date.UTC(HOY.getUTCFullYear(), HOY.getUTCMonth(), HOY.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + desplazamiento)
  return d
}

// Dos participantes, cada uno en su equipo, ya en desarrollo, con la
// bitácora y la calificación habilitadas.
async function enDesarrollo() {
  const e = await actividadEnFormacion(2)
  const alfa = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
  const beta = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
  await asignar(alfa, e.participantes[0].idMembresia, e.organizador.cookie)
  await asignar(beta, e.participantes[1].idMembresia, e.organizador.cookie)
  await prisma.actividad.update({
    where: { idActividad: e.id },
    data: { estado: 'desarrollo', fechaInicio: dia(-30), fechaTermino: dia(30) },
  })
  for (const [funcion, estado] of [
    ['bitacora_individual', 'guiada'],
    ['calificacion', 'habilitada'],
  ] as const) {
    await prisma.configuracionFuncion.update({
      where: { idActividad_funcion: { idActividad: e.id, funcion } },
      data: { estado },
    })
  }
  return { ...e, alfa, beta }
}

describe('calendario por elemento', () => {
  it('cada elemento tiene el suyo: generar uno no toca el de otro', async () => {
    const e = await actividadEnFormacion(1)
    const generar = (elemento: string, periodicidad: string) =>
      request(app)
        .put(`/api/actividades/${e.id}/periodos`)
        .set('Cookie', e.organizador.cookie)
        .send({ elemento, periodicidad })

    expect((await generar('avances', 'semanal')).status).toBe(200)
    expect((await generar('bitacora', 'quincenal')).status).toBe(200)
    const quitada = await generar('avances', 'ninguna')

    expect(quitada.status).toBe(200)
    const elementos = new Set(quitada.body.periodos.map((p: { elemento: string }) => p.elemento))
    expect(elementos).toEqual(new Set(['bitacora']))
  })

  it('rechaza un elemento sin calendario: 400', async () => {
    const e = await actividadEnFormacion(1)
    const respuesta = await request(app)
      .put(`/api/actividades/${e.id}/periodos`)
      .set('Cookie', e.organizador.cookie)
      .send({ elemento: 'general', periodicidad: 'semanal' })
    expect(respuesta.status).toBe(400)
  })
})

describe('GET /api/actividades/:id/entregas-por-periodo', () => {
  it('cuenta los equipos que publicaron un avance y los participantes que escribieron en la bitácora', async () => {
    const e = await enDesarrollo()
    const [avances, bitacora] = await Promise.all(
      (['avances', 'bitacora'] as const).map((elemento) =>
        prisma.periodoReporte.create({
          data: { idActividad: e.id, elemento, orden: 1, fechaInicio: dia(-3), fechaFin: dia(3) },
        }),
      ),
    )
    await request(app)
      .post(`/api/equipos/${e.alfa}/elementos`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ tipo: 'avances', contenido: 'Avance de esta semana' })
    await request(app)
      .post(`/api/actividades/${e.id}/bitacora`)
      .set('Cookie', e.participantes[1].cookie)
      .send({ respuestas: { tareas_cumplidas: 'Investigué.' } })

    const organiza = await request(app)
      .get(`/api/actividades/${e.id}/entregas-por-periodo`)
      .set('Cookie', e.organizador.cookie)
    expect(organiza.status).toBe(200)
    const porPeriodo = new Map(
      organiza.body.periodos.map((p: { idPeriodo: string }) => [p.idPeriodo, p]),
    )
    expect(porPeriodo.get(avances.idPeriodo)).toEqual({
      idPeriodo: avances.idPeriodo,
      hechos: 1,
      total: 2,
      unidad: 'equipos',
      mio: null,
    })
    expect(porPeriodo.get(bitacora.idPeriodo)).toMatchObject({
      hechos: 1,
      total: 2,
      unidad: 'participantes',
    })

    const deBeta = await request(app)
      .get(`/api/actividades/${e.id}/entregas-por-periodo`)
      .set('Cookie', e.participantes[1].cookie)
    const deBetaPorPeriodo = new Map(
      deBeta.body.periodos.map((p: { idPeriodo: string; mio: boolean }) => [p.idPeriodo, p.mio]),
    )
    expect(deBetaPorPeriodo.get(avances.idPeriodo)).toBe(false)
    expect(deBetaPorPeriodo.get(bitacora.idPeriodo)).toBe(true)
  })
})

describe('GET /api/actividades/:id/cumplimiento-instrumentos', () => {
  it('para quien organiza, cuántos participantes con equipo completaron cada instancia', async () => {
    const e = await enDesarrollo()
    const aspecto = await prisma.aspectoCalificacion.findFirstOrThrow({
      where: { componente: { idActividad: e.id, clave: 'proceso' } },
    })
    const instrumento = await prisma.instrumento.create({
      data: {
        idAspecto: aspecto.idAspecto,
        tipo: 'entrevista',
        origen: 'enlace',
        enlace: 'https://entrevista.example.com',
        nombre: 'Entrevista 1',
        fechaPlanificada: dia(2),
        orden: 0,
      },
    })
    await prisma.entregaInstrumento.create({
      data: {
        idInstrumento: instrumento.idInstrumento,
        idMembresia: e.participantes[0].idMembresia,
        contenido: 'Hecha.',
      },
    })

    const respuesta = await request(app)
      .get(`/api/actividades/${e.id}/cumplimiento-instrumentos`)
      .set('Cookie', e.organizador.cookie)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.instrumentos).toEqual([
      expect.objectContaining({ id: instrumento.idInstrumento, completados: 1, total: 2 }),
    ])

    const participante = await request(app)
      .get(`/api/actividades/${e.id}/cumplimiento-instrumentos`)
      .set('Cookie', e.participantes[0].cookie)
    expect(participante.status).toBe(403)
  })
})

describe('registros en el tiempo: se corrigen solo el mismo día', () => {
  const ayer = new Date(Date.now() - 26 * 60 * 60 * 1000)

  it('una entrada de bitácora de otro día ya no se edita: 409', async () => {
    const e = await enDesarrollo()
    const entrada = await request(app)
      .post(`/api/actividades/${e.id}/bitacora`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ respuestas: { tareas_cumplidas: 'Primera versión.' } })
    await prisma.bitacora.update({
      where: { idEntrada: entrada.body.entrada.id },
      data: { fechaCreacion: ayer },
    })

    const edicion = await request(app)
      .patch(`/api/bitacora/${entrada.body.entrada.id}`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ respuestas: { tareas_cumplidas: 'Reescrita.' } })
    expect(edicion.status).toBe(409)
  })

  it('un avance de otro día no se edita ni se elimina; una meta sí se edita', async () => {
    const e = await enDesarrollo()
    const crear = (tipo: string) =>
      request(app)
        .post(`/api/equipos/${e.alfa}/elementos`)
        .set('Cookie', e.participantes[0].cookie)
        .send({ tipo, contenido: `Un ${tipo}` })
    const avance = (await crear('avances')).body.elemento.id
    const meta = (await crear('metas')).body.elemento.id
    await prisma.elementoEspacioEquipo.updateMany({
      where: { idElemento: { in: [avance, meta] } },
      data: { fechaCreacion: ayer },
    })
    const editar = (id: string) =>
      request(app)
        .patch(`/api/elementos/${id}`)
        .set('Cookie', e.participantes[0].cookie)
        .send({ contenido: 'Cambiado' })

    expect((await editar(avance)).status).toBe(409)
    expect(
      (
        await request(app)
          .delete(`/api/elementos/${avance}`)
          .set('Cookie', e.participantes[0].cookie)
      ).status,
    ).toBe(409)
    expect((await editar(meta)).status).toBe(200)
  })

  it('el mismo día sí se corrige', async () => {
    const e = await enDesarrollo()
    const avance = await request(app)
      .post(`/api/equipos/${e.alfa}/elementos`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ tipo: 'avances', contenido: 'Con error' })
    const edicion = await request(app)
      .patch(`/api/elementos/${avance.body.elemento.id}`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ contenido: 'Corregido' })
    expect(edicion.status).toBe(200)
  })
})

describe('calificaciones', () => {
  it('quien participa ve su calificación solo desde el cierre', async () => {
    const e = await enDesarrollo()
    const pedir = () =>
      request(app)
        .get(`/api/actividades/${e.id}/calificaciones/${e.participantes[0].idMembresia}`)
        .set('Cookie', e.participantes[0].cookie)

    expect((await pedir()).status).toBe(409)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'cierre' } })
    expect((await pedir()).status).toBe(200)
  })

  it('la bitácora está en el proyecto pero se califica por persona, no por equipo', async () => {
    const e = await enDesarrollo()
    const porEquipo = await request(app)
      .get(`/api/actividades/${e.id}/calificaciones/proyecto`)
      .set('Cookie', e.organizador.cookie)
    expect(porEquipo.status).toBe(200)
    const claves = porEquipo.body.equipos[0].elementos.map((el: { clave: string }) => el.clave)
    expect(claves).not.toContain('bitacora')

    const bitacora = await prisma.instrumento.findFirstOrThrow({
      where: {
        aspecto: { clave: 'bitacora', componente: { idActividad: e.id, clave: 'proyecto' } },
      },
    })
    const deEquipo = await request(app)
      .put(
        `/api/actividades/${e.id}/instrumentos/${bitacora.idInstrumento}/puntajes/equipos/${e.alfa}`,
      )
      .set('Cookie', e.organizador.cookie)
      .send({ valor: 90 })
    expect(deEquipo.status).toBe(400)

    const porPersona = await request(app)
      .put(
        `/api/actividades/${e.id}/instrumentos/${bitacora.idInstrumento}/puntajes/${e.participantes[0].idMembresia}`,
      )
      .set('Cookie', e.organizador.cookie)
      .send({ valor: 90 })
    expect(porPersona.status).toBeLessThan(300)
  })

  it('separa lo que toca calificar de lo que el participante no ha respondido', async () => {
    const e = await enDesarrollo()
    const respuesta = await request(app)
      .get(`/api/actividades/${e.id}/calificaciones`)
      .set('Cookie', e.organizador.cookie)

    expect(respuesta.status).toBe(200)
    const [primera] = respuesta.body.calificaciones
    expect(primera.porCalificar).toEqual(
      expect.arrayContaining(['Metas', 'Bitácora', 'Aprendizaje']),
    )
    expect(primera.porResponder).toBe(0)
  })
})
