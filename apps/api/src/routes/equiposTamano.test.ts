import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import {
  app,
  registrar,
  actividadEnFormacion,
  fijarFormacion,
  crear,
  asignar,
  listar,
  cerrarFormacion,
  eventos,
  idEquipoCreado,
  type Escenario,
  limpiarBD,
} from './equiposFixtures.js'

// Tamaño mínimo y máximo de los equipos (P-27) y el intercambio de integrantes,
// que es la salida cuando dos equipos llenos no admiten movimientos sueltos.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

describe('tamaño de los equipos: PUT /api/actividades/:id/formacion/limites', () => {
  const fijar = (id: string, cookie: string, cuerpo: object) =>
    request(app).put(`/api/actividades/${id}/formacion/limites`).set('Cookie', cookie).send(cuerpo)

  it('quien organiza fija el mínimo y el máximo, se ven en la actividad y en la lista, y se registra el cambio', async () => {
    const e = await actividadEnFormacion(2)
    const respuesta = await fijar(e.id, e.organizador.cookie, { minimo: 2, maximo: 4 })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.actividad).toMatchObject({ tamanoMinimoEquipo: 2, tamanoMaximoEquipo: 4 })
    expect((await listar(e.id, e.organizador.cookie)).body.limites).toEqual({
      minimo: 2,
      maximo: 4,
    })

    const cambios = await eventos(e.id, 'configuracion_modificada')
    expect(cambios).toHaveLength(1)
    expect(cambios[0].datos).toMatchObject({
      funcion: 'formacion_equipos',
      antes: { minimo: null, maximo: null },
      despues: { minimo: 2, maximo: 4 },
    })
  })

  it('null quita un límite y lo que no llega se conserva; repetir el mismo valor no registra evento', async () => {
    const e = await actividadEnFormacion(1)
    await fijar(e.id, e.organizador.cookie, { minimo: 2, maximo: 4 })
    const quitar = await fijar(e.id, e.organizador.cookie, { maximo: null })
    expect(quitar.body.actividad).toMatchObject({ tamanoMinimoEquipo: 2, tamanoMaximoEquipo: null })

    await fijar(e.id, e.organizador.cookie, { minimo: 2 })
    expect(await eventos(e.id, 'configuracion_modificada')).toHaveLength(2)
  })

  it('valida: enteros de 1 a 100, mínimo no mayor que el máximo, al menos un campo: 400', async () => {
    const e = await actividadEnFormacion(1)
    for (const cuerpo of [{}, { maximo: 0 }, { minimo: 1.5 }, { maximo: 101 }, { minimo: '2' }]) {
      const r = await fijar(e.id, e.organizador.cookie, cuerpo)
      expect(r.status, JSON.stringify(cuerpo)).toBe(400)
    }
    await fijar(e.id, e.organizador.cookie, { maximo: 3 })
    const invertido = await fijar(e.id, e.organizador.cookie, { minimo: 5 })
    expect(invertido.status).toBe(400)
    expect(invertido.body.detallePorCampo.minimo).toBeDefined()
  })

  it('un participante no puede: 403; en desarrollo ya no: 409; un no miembro: 404', async () => {
    const e = await actividadEnFormacion(1)
    expect((await fijar(e.id, e.participantes[0].cookie, { maximo: 3 })).status).toBe(403)
    expect((await fijar(e.id, (await registrar('Ajena')).cookie, { maximo: 3 })).status).toBe(404)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
    expect((await fijar(e.id, e.organizador.cookie, { maximo: 3 })).status).toBe(409)
  })
})

describe('tamaño de los equipos: el máximo se aplica a todos', () => {
  const fijar = (id: string, cookie: string, cuerpo: object) =>
    request(app).put(`/api/actividades/${id}/formacion/limites`).set('Cookie', cookie).send(cuerpo)

  it('un participante no puede unirse a un equipo lleno: 422 y no se escribe nada', async () => {
    const e = await actividadEnFormacion(3)
    await fijar(e.id, e.organizador.cookie, { maximo: 2 })
    const idA = await idEquipoCreado(e.id, e.participantes[0].cookie, 'Alfa')
    expect(
      (await asignar(idA, e.participantes[1].idMembresia, e.participantes[1].cookie)).status,
    ).toBe(200)

    const lleno = await asignar(idA, e.participantes[2].idMembresia, e.participantes[2].cookie)
    expect(lleno.status).toBe(422)
    expect(lleno.body.codigo).toBe('equipo_lleno')
    expect(lleno.body.mensaje).toMatch(/máximo de 2 integrantes/)
    expect(await prisma.integranteEquipo.count()).toBe(2)
  })

  it('también a quien organiza: no puede asignar a un equipo lleno ni integrarse en él', async () => {
    const e = await actividadEnFormacion(3)
    await fijar(e.id, e.organizador.cookie, { maximo: 1 })
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)

    expect((await asignar(idA, e.participantes[1].idMembresia, e.organizador.cookie)).status).toBe(
      422,
    )
    expect((await asignar(idA, e.organizador.idMembresia, e.organizador.cookie)).status).toBe(422)
  })

  it('un equipo con un desactivado tiene ese lugar libre; quien ya está en el equipo no choca con el máximo', async () => {
    const e = await actividadEnFormacion(3)
    await fijar(e.id, e.organizador.cookie, { maximo: 1 })
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    expect((await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)).status).toBe(
      200,
    )

    await prisma.membresia.update({
      where: { idMembresia: e.participantes[0].idMembresia },
      data: { estado: 'desactivada' },
    })
    expect((await asignar(idA, e.participantes[1].idMembresia, e.organizador.cookie)).status).toBe(
      200,
    )
  })

  it('crear un equipo y quedar en él siempre cabe, aun con máximo 1', async () => {
    const e = await actividadEnFormacion(2)
    await fijar(e.id, e.organizador.cookie, { maximo: 1 })
    expect((await crear(e.id, e.participantes[0].cookie, 'Alfa')).status).toBe(201)
    expect((await crear(e.id, e.participantes[1].cookie, 'Beta')).status).toBe(201)
  })

  it('bajar el máximo por debajo de un equipo ya formado no lo desarma, pero nadie más entra', async () => {
    const e = await actividadEnFormacion(3)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    await asignar(idA, e.participantes[1].idMembresia, e.organizador.cookie)
    expect((await fijar(e.id, e.organizador.cookie, { maximo: 1 })).status).toBe(200)

    expect((await listar(e.id, e.organizador.cookie)).body.equipos[0].integrantes).toHaveLength(2)
    expect((await asignar(idA, e.participantes[2].idMembresia, e.organizador.cookie)).status).toBe(
      422,
    )
  })

  it('al cerrar la formación, si no cabe nadie más se crean los equipos nuevos necesarios', async () => {
    const e = await actividadEnFormacion(7)
    await fijarFormacion(e, 'manual')
    await fijar(e.id, e.organizador.cookie, { maximo: 3 })
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await idEquipoCreado(e.id, e.organizador.cookie, 'Equipo 3')
    for (const p of e.participantes.slice(0, 2)) {
      await asignar(idA, p.idMembresia, e.organizador.cookie)
    }

    const cierre = await cerrarFormacion(e.id, e.organizador.cookie)
    expect(cierre.status).toBe(200)

    const lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.sinEquipo).toEqual([])
    const tamanos = lista.equipos.map((x: { integrantes: unknown[] }) => x.integrantes.length)
    expect(Math.max(...tamanos)).toBeLessThanOrEqual(3)
    // Caben 4 de las 5 personas restantes (Alfa 1 + Equipo 3: 3); la que sobra abre un equipo nuevo.
    expect(lista.equipos).toHaveLength(3)
    expect(lista.equipos.map((x: { nombre: string }) => x.nombre)).toEqual([
      'Alfa',
      'Equipo 3',
      'Equipo 4',
    ])

    const [reparto] = await eventos(e.id, 'reparto_automatico')
    expect(reparto.datos).toMatchObject({ maximo: 3, equiposCreados: [{ nombre: 'Equipo 4' }] })
  })

  it('sin máximo, el cierre no crea equipos nuevos', async () => {
    const e = await actividadEnFormacion(5)
    await fijarFormacion(e, 'manual')
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await cerrarFormacion(e.id, e.organizador.cookie)
    expect(await prisma.equipo.count({ where: { idActividad: e.id } })).toBe(1)
    expect((await eventos(e.id, 'reparto_automatico'))[0].datos).toMatchObject({
      equiposCreados: [],
    })
  })

  it('la propuesta crea los equipos necesarios para respetar el máximo', async () => {
    const e = await actividadEnFormacion(7)
    await fijarFormacion(e, 'manual')
    await fijar(e.id, e.organizador.cookie, { maximo: 2 })

    const respuesta = await request(app)
      .post(`/api/actividades/${e.id}/equipos/propuesta`)
      .set('Cookie', e.organizador.cookie)
      .send({ semilla: 9 })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({ numeroEquipos: 4, numeroEquiposEsperado: 3 })
    expect(
      Math.max(
        ...respuesta.body.equipos.map((x: { integrantes: unknown[] }) => x.integrantes.length),
      ),
    ).toBeLessThanOrEqual(2)
  })
})

describe('POST /api/actividades/:id/equipos/intercambio', () => {
  const intercambiar = (id: string, cookie: string, a: string, b: string) =>
    request(app)
      .post(`/api/actividades/${id}/equipos/intercambio`)
      .set('Cookie', cookie)
      .send({ idMembresiaA: a, idMembresiaB: b })

  // Dos equipos llenos (máximo 2): Alfa con los participantes 0 y 1, Beta con 2 y 3.
  async function dosEquiposLlenos() {
    const e = await actividadEnFormacion(4)
    await fijarFormacion(e, 'manual')
    await request(app)
      .put(`/api/actividades/${e.id}/formacion/limites`)
      .set('Cookie', e.organizador.cookie)
      .send({ maximo: 2 })
    const alfa = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const beta = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
    const [p0, p1, p2, p3] = e.participantes
    for (const [equipo, p] of [
      [alfa, p0],
      [alfa, p1],
      [beta, p2],
      [beta, p3],
    ] as const) {
      expect((await asignar(equipo, p.idMembresia, e.organizador.cookie)).status).toBe(200)
    }
    return { e, alfa, beta, p0, p1, p2, p3 }
  }

  const integrantesDe = async (e: Escenario, idEquipo: string) =>
    (
      (await listar(e.id, e.organizador.cookie)).body.equipos.find(
        (x: { id: string }) => x.id === idEquipo,
      ).integrantes as { idMembresia: string }[]
    )
      .map((i) => i.idMembresia)
      .sort()

  it('con dos equipos llenos, mover a uno falla pero intercambiar a dos funciona', async () => {
    const { e, alfa, beta, p0, p1, p2, p3 } = await dosEquiposLlenos()

    const mover = await asignar(beta, p0.idMembresia, e.organizador.cookie)
    expect(mover.status).toBe(422)
    expect(mover.body.codigo).toBe('equipo_lleno')

    const respuesta = await intercambiar(e.id, e.organizador.cookie, p0.idMembresia, p2.idMembresia)
    expect(respuesta.status).toBe(200)
    expect(await integrantesDe(e, alfa)).toEqual([p1.idMembresia, p2.idMembresia].sort())
    expect(await integrantesDe(e, beta)).toEqual([p0.idMembresia, p3.idMembresia].sort())
    // Los dos equipos siguen en el máximo.
    expect(
      respuesta.body.equipos.map((x: { integrantes: unknown[] }) => x.integrantes.length),
    ).toEqual([2, 2])
  })

  it('registra un solo evento con los dos movimientos', async () => {
    const { e, alfa, beta, p0, p2 } = await dosEquiposLlenos()
    await intercambiar(e.id, e.organizador.cookie, p0.idMembresia, p2.idMembresia)

    const registrados = await eventos(e.id, 'integrantes_intercambiados')
    expect(registrados).toHaveLength(1)
    expect(registrados[0]).toMatchObject({
      tipoActor: 'usuario',
      idUsuarioActor: e.organizador.idUsuario,
      categoria: 'estructura',
      datos: {
        a: { nombre: 'Pablo1 Prueba', de: { id: alfa }, a: { id: beta } },
        b: { nombre: 'Pablo3 Prueba', de: { id: beta }, a: { id: alfa } },
      },
    })
  })

  it('también en desarrollo, donde nadie puede quedar sin equipo', async () => {
    const { e, alfa, p0, p2 } = await dosEquiposLlenos()
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })

    expect(
      (await intercambiar(e.id, e.organizador.cookie, p0.idMembresia, p2.idMembresia)).status,
    ).toBe(200)
    expect(await integrantesDe(e, alfa)).toContain(p2.idMembresia)
  })

  it('quien organiza puede intercambiarse a sí mismo con un participante', async () => {
    const e = await actividadEnFormacion(2)
    await fijarFormacion(e, 'manual')
    const alfa = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const beta = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
    await asignar(alfa, e.organizador.idMembresia, e.organizador.cookie)
    await asignar(beta, e.participantes[0].idMembresia, e.organizador.cookie)

    expect(
      (
        await intercambiar(
          e.id,
          e.organizador.cookie,
          e.organizador.idMembresia,
          e.participantes[0].idMembresia,
        )
      ).status,
    ).toBe(200)
    expect(await integrantesDe(e, beta)).toEqual([e.organizador.idMembresia])
  })

  it('rechaza lo que no es un intercambio: misma persona, mismo equipo, alguien sin equipo o desactivado o ajeno: 422', async () => {
    const { e, alfa, p0, p1, p2 } = await dosEquiposLlenos()
    await prisma.integranteEquipo.deleteMany({ where: { idMembresia: p2.idMembresia } })
    const otra = await actividadEnFormacion(1)

    const casos: [string, string, string][] = [
      ['la misma persona', p0.idMembresia, p0.idMembresia],
      ['del mismo equipo', p0.idMembresia, p1.idMembresia],
      ['sin equipo', p0.idMembresia, p2.idMembresia],
      ['de otra actividad', p0.idMembresia, otra.participantes[0].idMembresia],
      ['inexistente', p0.idMembresia, crypto.randomUUID()],
    ]
    for (const [motivo, a, b] of casos) {
      const respuesta = await intercambiar(e.id, e.organizador.cookie, a, b)
      expect(respuesta.status, motivo).toBe(422)
    }

    await prisma.membresia.update({
      where: { idMembresia: e.participantes[3].idMembresia },
      data: { estado: 'desactivada' },
    })
    expect(
      (
        await intercambiar(
          e.id,
          e.organizador.cookie,
          p0.idMembresia,
          e.participantes[3].idMembresia,
        )
      ).status,
    ).toBe(422)

    expect(await eventos(e.id, 'integrantes_intercambiados')).toHaveLength(0)
    expect(await integrantesDe(e, alfa)).toEqual([p0.idMembresia, p1.idMembresia].sort())
  })

  it('valida el cuerpo: 400', async () => {
    const e = await actividadEnFormacion(1)
    const respuesta = await request(app)
      .post(`/api/actividades/${e.id}/equipos/intercambio`)
      .set('Cookie', e.organizador.cookie)
      .send({ idMembresiaA: 'x' })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.idMembresiaB).toBeDefined()
  })

  it('un participante no puede: 403; un no miembro: 404; en cierre: 409', async () => {
    const { e, p0, p2 } = await dosEquiposLlenos()
    expect((await intercambiar(e.id, p0.cookie, p0.idMembresia, p2.idMembresia)).status).toBe(403)
    expect(
      (await intercambiar(e.id, (await registrar('Ajena')).cookie, p0.idMembresia, p2.idMembresia))
        .status,
    ).toBe(404)

    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'cierre' } })
    expect(
      (await intercambiar(e.id, e.organizador.cookie, p0.idMembresia, p2.idMembresia)).status,
    ).toBe(409)
  })
})
