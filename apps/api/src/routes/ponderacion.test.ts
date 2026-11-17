import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import { app, actividadEnFormacion, asignar, idEquipoCreado, limpiarBD } from './equiposFixtures.js'

// Lo que protege a un instrumento que ya puntúa a alguien (nucleo §10.1):
// con respuestas, entregas o puntajes capturados no se reemplaza ni cambia
// de formato, porque eso borraría o dejaría fuera del cálculo esos puntajes.
// Y la validación de su enlace.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

// Una actividad en desarrollo con calificación y una actividad externa en el
// aspecto de interacción, con un puntaje capturado y nada más.
async function instrumentoConPuntaje() {
  const e = await actividadEnFormacion(1)
  const alfa = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
  await asignar(alfa, e.participantes[0].idMembresia, e.organizador.cookie)
  await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
  await prisma.configuracionFuncion.update({
    where: { idActividad_funcion: { idActividad: e.id, funcion: 'calificacion' } },
    data: { estado: 'habilitada' },
  })
  const aspecto = await prisma.aspectoCalificacion.findFirstOrThrow({
    where: { clave: 'interaccion', componente: { idActividad: e.id } },
  })
  const instrumento = await prisma.instrumento.create({
    data: {
      idAspecto: aspecto.idAspecto,
      tipo: 'entrevista',
      origen: 'enlace',
      enlace: 'https://entrevista.example.com',
      nombre: 'Entrevista 1',
      orden: 0,
    },
  })
  await prisma.puntajeCapturado.create({
    data: {
      idInstrumento: instrumento.idInstrumento,
      idMembresia: e.participantes[0].idMembresia,
      valor: 90,
      idMembresiaCalificador: e.organizador.idMembresia,
    },
  })
  return { ...e, idAspecto: aspecto.idAspecto, idInstrumento: instrumento.idInstrumento }
}

describe('instrumentos con puntajes capturados', () => {
  it('no se reemplazan al cambiar el tipo o la periodicidad del aspecto: 422', async () => {
    const e = await instrumentoConPuntaje()

    const respuesta = await request(app)
      .put(`/api/actividades/${e.id}/aspectos/${e.idAspecto}/instrumentos`)
      .set('Cookie', e.organizador.cookie)
      .send({ tipo: null })

    expect(respuesta.status).toBe(422)
    expect(await prisma.puntajeCapturado.count()).toBe(1)
  })

  it('no cambian de formato: 422', async () => {
    const e = await instrumentoConPuntaje()

    const respuesta = await request(app)
      .patch(`/api/actividades/${e.id}/instrumentos/${e.idInstrumento}`)
      .set('Cookie', e.organizador.cookie)
      .send({ formato: 'plantilla' })

    expect(respuesta.status).toBe(422)
  })

  it('la ponderación los marca como con respuestas, para que la pantalla los bloquee', async () => {
    const e = await instrumentoConPuntaje()

    const respuesta = await request(app)
      .get(`/api/actividades/${e.id}/ponderacion`)
      .set('Cookie', e.organizador.cookie)

    const instrumentos = respuesta.body.ponderacion.componentes
      .flatMap((c: { aspectos: { instrumentos: unknown[] }[] }) => c.aspectos)
      .flatMap((a: { instrumentos: { id: string; conRespuestas: boolean }[] }) => a.instrumentos)
    expect(instrumentos.find((i: { id: string }) => i.id === e.idInstrumento)).toMatchObject({
      conRespuestas: true,
    })
  })
})

describe('enlace de una instancia', () => {
  it('un valor que no es texto se rechaza, no borra el enlace: 400', async () => {
    const e = await instrumentoConPuntaje()

    for (const enlace of [123, {}, true]) {
      const respuesta = await request(app)
        .patch(`/api/actividades/${e.id}/instrumentos/${e.idInstrumento}`)
        .set('Cookie', e.organizador.cookie)
        .send({ enlace })
      expect(respuesta.status, JSON.stringify(enlace)).toBe(400)
    }
    const instrumento = await prisma.instrumento.findUniqueOrThrow({
      where: { idInstrumento: e.idInstrumento },
    })
    expect(instrumento.enlace).toBe('https://entrevista.example.com')
  })

  it('null o texto vacío sí lo quitan', async () => {
    const e = await instrumentoConPuntaje()

    const respuesta = await request(app)
      .patch(`/api/actividades/${e.id}/instrumentos/${e.idInstrumento}`)
      .set('Cookie', e.organizador.cookie)
      .send({ enlace: '  ' })

    expect(respuesta.status).toBe(200)
    const instrumento = await prisma.instrumento.findUniqueOrThrow({
      where: { idInstrumento: e.idInstrumento },
    })
    expect(instrumento.enlace).toBeNull()
  })
})
