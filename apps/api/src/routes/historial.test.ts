import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import {
  app,
  actividadConParticipantes,
  actividadEnFormacion,
  idEquipoCreado,
  limpiarBD,
  registrar,
} from './equiposFixtures.js'

// Integración contra Postgres real (docs/diseno-desarrollo-nucleo.md §12.2).
// Cubre la consulta cronológica mínima de este incremento (nucleo §5.5,
// §11.2): sin filtros ni agregación (Fase B), con la visibilidad por rol de
// general §7.3.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const historial = (idActividad: string, cookie: string) =>
  request(app).get(`/api/actividades/${idActividad}/historial`).set('Cookie', cookie)

describe('GET /api/actividades/:id/historial', () => {
  it('el organizador ve los eventos de estructura y de aportación, cronológico inverso', async () => {
    const e = await actividadEnFormacion(1)
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')

    const respuesta = await historial(e.id, e.organizador.cookie)
    expect(respuesta.status).toBe(200)
    const tipos = respuesta.body.eventos.map((ev: { tipoEvento: string }) => ev.tipoEvento)
    expect(tipos).toContain('actividad_creada')
    expect(tipos).toContain('equipo_creado')

    // Cronológico inverso: el primero de la lista es el más reciente.
    const fechas = respuesta.body.eventos.map((ev: { fecha: string }) =>
      new Date(ev.fecha).getTime(),
    )
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a))
  })

  it('un participante ve estructura y aportación, igual que el organizador en este incremento', async () => {
    const e = await actividadConParticipantes(1)

    const respuesta = await historial(e.id, e.participantes[0].cookie)
    expect(respuesta.status).toBe(200)
    const tipos = respuesta.body.eventos.map((ev: { tipoEvento: string }) => ev.tipoEvento)
    expect(tipos).toContain('actividad_creada')
  })

  it('quien no es miembro de la actividad recibe 404', async () => {
    const e = await actividadConParticipantes(0)
    const ajeno = await registrar('Ajeno')

    const respuesta = await historial(e.id, ajeno.cookie)
    expect(respuesta.status).toBe(404)
  })

  it('identifica al actor por nombre y conserva null para eventos del sistema', async () => {
    const e = await actividadEnFormacion(1)
    const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')

    const respuesta = await historial(e.id, e.organizador.cookie)
    const creado = respuesta.body.eventos.find(
      (ev: { tipoEvento: string; idEntidad: string }) =>
        ev.tipoEvento === 'equipo_creado' && ev.idEntidad === idEquipo,
    )
    expect(creado.actor).toBe(`${e.organizador.nombre} Prueba`)
  })
})
