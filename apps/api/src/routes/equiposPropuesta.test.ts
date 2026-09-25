import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import { proponerEquipos } from '../utilidades/reparto.js'
import {
  app,
  registrar,
  actividadConParticipantes,
  actividadEnFormacion,
  fijarFormacion,
  asignar,
  listar,
  cerrarFormacion,
  estadoDe,
  eventos,
  idEquipoCreado,
  limpiarBD,
} from './equiposFixtures.js'

// Propuesta del sistema (nucleo §8.2), con el reparto barajado por semilla.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/actividades/:id/equipos/propuesta', () => {
  const proponer = (id: string, cookie: string, cuerpo: object = {}) =>
    request(app).post(`/api/actividades/${id}/equipos/propuesta`).set('Cookie', cookie).send(cuerpo)

  async function conPropuesta(participantes: number) {
    const e = await actividadEnFormacion(participantes)
    await fijarFormacion(e, 'propuesta_sistema')
    return e
  }

  function nombresPorEquipo(cuerpo: {
    equipos: { nombre: string; integrantes: { idMembresia: string }[] }[]
  }) {
    return cuerpo.equipos.map((x) => [x.nombre, x.integrantes.map((i) => i.idMembresia).sort()])
  }

  it('reparte a todos entre los equipos esperados, equilibrado, como equipos normales en formación', async () => {
    const e = await conPropuesta(7)
    const respuesta = await proponer(e.id, e.organizador.cookie)

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({
      numeroEquipos: 3,
      numeroEquiposEsperado: 3,
      sinEquipo: [],
    })
    expect(respuesta.body.equipos.map((x: { nombre: string }) => x.nombre)).toEqual([
      'Equipo 1',
      'Equipo 2',
      'Equipo 3',
    ])
    const tamanos = respuesta.body.equipos.map(
      (x: { integrantes: unknown[] }) => x.integrantes.length,
    )
    expect(tamanos.sort()).toEqual([2, 2, 3])
    const asignados = respuesta.body.equipos.flatMap(
      (x: { integrantes: { idMembresia: string }[] }) => x.integrantes.map((i) => i.idMembresia),
    )
    expect(asignados.sort()).toEqual(e.participantes.map((p) => p.idMembresia).sort())

    // Siguen en formación: confirmar es la transición, no hay estado borrador.
    expect(await estadoDe(e.id)).toBe('formacion_equipos')
    expect((await listar(e.id, e.organizador.cookie)).body.equipos).toHaveLength(3)
  })

  it('la semilla queda en un solo evento y reproduce el resultado', async () => {
    const e = await conPropuesta(7)
    const respuesta = await proponer(e.id, e.organizador.cookie, { semilla: 1234 })

    expect(respuesta.body.semilla).toBe(1234)
    const eventosPropuesta = await eventos(e.id, 'propuesta_generada')
    expect(eventosPropuesta).toHaveLength(1)
    expect(eventosPropuesta[0]).toMatchObject({
      tipoActor: 'usuario',
      idUsuarioActor: e.organizador.idUsuario,
      categoria: 'estructura',
      datos: { semilla: 1234, numeroEquipos: 3, reemplazados: [] },
    })
    // Una sola escritura del historial por propuesta, no una por equipo.
    expect(await eventos(e.id, 'equipo_creado')).toHaveLength(0)
    expect(await eventos(e.id, 'integrante_asignado')).toHaveLength(0)

    // El resultado es exactamente el de la función pura con esa semilla, sobre
    // los participantes en orden de incorporación.
    const esperado = proponerEquipos(
      e.participantes.map((p) => p.idMembresia),
      3,
      1234,
    )
    expect(nombresPorEquipo(respuesta.body)).toEqual(
      esperado.map((ids, i) => [`Equipo ${i + 1}`, [...ids].sort()]),
    )
  })

  it('con la misma semilla da lo mismo; con semillas distintas puede cambiar', async () => {
    const e = await conPropuesta(9)
    const primera = await proponer(e.id, e.organizador.cookie, { semilla: 7 })
    const repetida = await proponer(e.id, e.organizador.cookie, { semilla: 7 })
    expect(nombresPorEquipo(repetida.body)).toEqual(nombresPorEquipo(primera.body))

    const distintas = new Set<string>()
    for (const semilla of [1, 2, 3, 4, 5, 6]) {
      const r = await proponer(e.id, e.organizador.cookie, { semilla })
      distintas.add(JSON.stringify(nombresPorEquipo(r.body)))
    }
    expect(distintas.size).toBeGreaterThan(1)
  })

  it('sin semilla, el servidor elige una y la devuelve', async () => {
    const e = await conPropuesta(3)
    const respuesta = await proponer(e.id, e.organizador.cookie)
    expect(Number.isInteger(respuesta.body.semilla)).toBe(true)
    expect((await eventos(e.id, 'propuesta_generada'))[0].datos).toMatchObject({
      semilla: respuesta.body.semilla,
    })
  })

  it('con menos participantes que equipos esperados propone tantos equipos como participantes', async () => {
    const e = await conPropuesta(2)
    const respuesta = await proponer(e.id, e.organizador.cookie)
    expect(respuesta.body).toMatchObject({ numeroEquipos: 2, numeroEquiposEsperado: 3 })
    expect(respuesta.body.equipos).toHaveLength(2)
    expect(
      respuesta.body.equipos.every((x: { integrantes: unknown[] }) => x.integrantes.length === 1),
    ).toBe(true)
  })

  it('regenerar reemplaza los equipos anteriores y conserva en el evento lo reemplazado', async () => {
    const e = await conPropuesta(4)
    const manual = await idEquipoCreado(e.id, e.organizador.cookie, 'Mis pumas')
    await asignar(manual, e.participantes[0].idMembresia, e.organizador.cookie)
    await request(app)
      .patch(`/api/equipos/${manual}`)
      .set('Cookie', e.organizador.cookie)
      .send({ descripcionActividad: 'Mapear el humedal' })

    const respuesta = await proponer(e.id, e.organizador.cookie, { semilla: 5 })

    expect(respuesta.status).toBe(201)
    const lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.equipos.map((x: { nombre: string }) => x.nombre)).toEqual([
      'Equipo 1',
      'Equipo 2',
      'Equipo 3',
    ])
    expect(await prisma.equipo.count({ where: { idActividad: e.id } })).toBe(3)

    const [evento] = await eventos(e.id, 'propuesta_generada')
    expect(evento.datos).toMatchObject({
      reemplazados: [
        {
          nombre: 'Mis pumas',
          descripcionActividad: 'Mapear el humedal',
          integrantes: [{ idMembresia: e.participantes[0].idMembresia }],
        },
      ],
    })
  })

  it('reparte solo a participantes activos; quien está desactivado no entra', async () => {
    const e = await conPropuesta(3)
    await prisma.membresia.update({
      where: { idMembresia: e.participantes[2].idMembresia },
      data: { estado: 'desactivada' },
    })
    const respuesta = await proponer(e.id, e.organizador.cookie)
    const asignados = respuesta.body.equipos.flatMap(
      (x: { integrantes: { idMembresia: string }[] }) => x.integrantes.map((i) => i.idMembresia),
    )
    expect(asignados.sort()).toEqual(
      [e.participantes[0].idMembresia, e.participantes[1].idMembresia].sort(),
    )
  })

  it('sin participantes activos no hay nada que proponer: 422, sin escribir', async () => {
    const e = await conPropuesta(1)
    await prisma.membresia.update({
      where: { idMembresia: e.participantes[0].idMembresia },
      data: { estado: 'desactivada' },
    })
    const respuesta = await proponer(e.id, e.organizador.cookie)
    expect(respuesta.status).toBe(422)
    expect(respuesta.body.codigo).toBe('propuesta_sin_participantes')
    expect(await eventos(e.id, 'propuesta_generada')).toHaveLength(0)
  })

  it('solo existe con la función en propuesta_sistema: 409 en los otros estados', async () => {
    for (const estado of ['autogestionado', 'manual']) {
      const e = await actividadEnFormacion(2)
      await fijarFormacion(e, estado)
      const respuesta = await proponer(e.id, e.organizador.cookie)
      expect(respuesta.status, estado).toBe(409)
      expect(await prisma.equipo.count({ where: { idActividad: e.id } })).toBe(0)
      await prisma.actividad.deleteMany()
    }
  })

  it('solo en formación: 409 durante la inscripción y en desarrollo', async () => {
    const enInscripcion = await actividadConParticipantes(2)
    await fijarFormacion(enInscripcion, 'propuesta_sistema')
    expect((await proponer(enInscripcion.id, enInscripcion.organizador.cookie)).status).toBe(409)

    const e = await conPropuesta(2)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
    expect((await proponer(e.id, e.organizador.cookie)).status).toBe(409)
  })

  it('un participante no puede: 403; un co-organizador necesita gestionar_equipos', async () => {
    const e = await conPropuesta(2)
    expect((await proponer(e.id, e.participantes[0].cookie)).status).toBe(403)

    const con = await registrar('Con')
    const sin = await registrar('Sin')
    for (const [persona, permisos] of [
      [con, ['gestionar_equipos']],
      [sin, ['configurar_actividad']],
    ] as const) {
      await request(app)
        .put(`/api/actividades/${e.id}/coorganizadores/${persona.idUsuario}`)
        .set('Cookie', e.organizador.cookie)
        .send({ permisos })
    }
    expect((await proponer(e.id, sin.cookie)).status).toBe(403)
    expect((await proponer(e.id, con.cookie)).status).toBe(201)
  })

  it('rechaza una semilla inválida con 400', async () => {
    const e = await conPropuesta(2)
    const respuesta = await proponer(e.id, e.organizador.cookie, { semilla: -3 })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.semilla).toBeDefined()
  })

  it('se ajusta con la asignación manual y confirmarla es cerrar la formación, sin más reparto', async () => {
    const e = await conPropuesta(4)
    const propuesta = await proponer(e.id, e.organizador.cookie, { semilla: 11 })
    const [equipo1, equipo2] = propuesta.body.equipos

    // Se mueve a alguien de un equipo a otro, como en cualquier asignación manual.
    const movido = equipo1.integrantes[0].idMembresia
    expect((await asignar(equipo2.id, movido, e.organizador.cookie)).status).toBe(200)

    const cierre = await cerrarFormacion(e.id, e.organizador.cookie)
    expect(cierre.status).toBe(200)
    expect(await estadoDe(e.id)).toBe('desarrollo')
    expect(await eventos(e.id, 'reparto_automatico')).toHaveLength(0)
    const enEquipo2 = (await listar(e.id, e.organizador.cookie)).body.equipos.find(
      (x: { id: string }) => x.id === equipo2.id,
    )
    expect(enEquipo2.integrantes.map((i: { idMembresia: string }) => i.idMembresia)).toContain(
      movido,
    )
  })

  it('las capacidades ofrecen la propuesta solo con la función en propuesta_sistema', async () => {
    const e = await conPropuesta(1)
    const capacidades = async () =>
      (await request(app).get(`/api/actividades/${e.id}`).set('Cookie', e.organizador.cookie)).body
        .actividad.capacidades as string[]
    expect(await capacidades()).toContain('generar_propuesta_equipos')
    await fijarFormacion(e, 'manual')
    expect(await capacidades()).not.toContain('generar_propuesta_equipos')
  })
})
