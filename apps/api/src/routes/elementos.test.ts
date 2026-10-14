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
  registrar,
} from './equiposFixtures.js'

// Integración contra Postgres real (docs/diseno-desarrollo-nucleo.md §12.2).
// Cubre el contenido del espacio de equipo de nucleo §9.1: los cuatro
// endpoints de §9.4 (listar, crear, editar, eliminar), que cualquier
// integrante opere sobre cualquier elemento, que quien no integra el equipo
// no pueda ni verlo (participante) ni escribirlo (ningún rol), y el evento
// del historial de cada escritura.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const crearElemento = (idEquipo: string, cookie: string, tipo: string, contenido: string) =>
  request(app)
    .post(`/api/equipos/${idEquipo}/elementos`)
    .set('Cookie', cookie)
    .send({ tipo, contenido })

const listarElementos = (idEquipo: string, cookie: string, tipo?: string) =>
  request(app)
    .get(`/api/equipos/${idEquipo}/elementos${tipo ? `?tipo=${tipo}` : ''}`)
    .set('Cookie', cookie)

const editarElemento = (idElemento: string, cookie: string, contenido: string) =>
  request(app).patch(`/api/elementos/${idElemento}`).set('Cookie', cookie).send({ contenido })

const eliminarElemento = (idElemento: string, cookie: string) =>
  request(app).delete(`/api/elementos/${idElemento}`).set('Cookie', cookie)

// Dos participantes en un equipo ya en desarrollo, listos para usar su
// espacio. Se fija el estado directamente, como el resto de las pruebas de
// equipos: la transición automática no es lo que se prueba aquí.
async function equipoEnDesarrollo() {
  const e = await actividadEnFormacion(2)
  const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
  await asignar(idEquipo, e.participantes[0].idMembresia, e.organizador.cookie)
  await asignar(idEquipo, e.participantes[1].idMembresia, e.organizador.cookie)
  await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
  return { ...e, idEquipo }
}

describe('POST /api/equipos/:id/elementos', () => {
  it('cualquier integrante crea una meta, un avance o un recurso', async () => {
    const e = await equipoEnDesarrollo()

    const meta = await crearElemento(
      e.idEquipo,
      e.participantes[0].cookie,
      'metas',
      'Entregar el reporte final',
    )
    expect(meta.status).toBe(201)
    expect(meta.body.elemento).toMatchObject({
      tipo: 'metas',
      contenido: 'Entregar el reporte final',
      autor: `${e.participantes[0].nombre} Prueba`,
    })

    const avance = await crearElemento(
      e.idEquipo,
      e.participantes[1].cookie,
      'avances',
      'Ya hicimos el borrador',
    )
    expect(avance.status).toBe(201)
    expect(avance.body.elemento.tipo).toBe('avances')
  })

  it('registra elemento_creado en el historial, categoría aportación', async () => {
    const e = await equipoEnDesarrollo()
    const respuesta = await crearElemento(
      e.idEquipo,
      e.participantes[0].cookie,
      'recursos',
      'https://ejemplo.com',
    )
    expect(respuesta.status).toBe(201)

    const registrados = await eventos(e.id, 'elemento_creado')
    expect(registrados).toHaveLength(1)
    expect(registrados[0]).toMatchObject({
      categoria: 'aportacion',
      idEntidad: respuesta.body.elemento.id,
      idUsuarioActor: e.participantes[0].idUsuario,
    })
    expect(registrados[0].datos).toMatchObject({
      tipo: 'recursos',
      extracto: 'https://ejemplo.com',
    })
  })

  it('rechaza un tipo que no es del catálogo, 400', async () => {
    const e = await equipoEnDesarrollo()
    const respuesta = await crearElemento(e.idEquipo, e.participantes[0].cookie, 'otro', 'x')
    expect(respuesta.status).toBe(400)
  })

  it('un participante que no integra el equipo no puede escribir: 404', async () => {
    const e = await equipoEnDesarrollo()
    const sinEquipo = await registrar('Sara')
    await request(app).post(`/api/claves/${e.claveIngreso}/union`).set('Cookie', sinEquipo.cookie)

    const respuesta = await crearElemento(e.idEquipo, sinEquipo.cookie, 'metas', 'x')
    expect(respuesta.status).toBe(404)
  })

  it('el organizador, que no integra ningún equipo, no puede escribir en el de otros: 403', async () => {
    const e = await equipoEnDesarrollo()
    const respuesta = await crearElemento(e.idEquipo, e.organizador.cookie, 'metas', 'x')
    expect(respuesta.status).toBe(403)
  })

  it('no se puede crear un elemento de un tipo deshabilitado en la configuración: 409', async () => {
    const e = await actividadEnFormacion(2)
    await request(app)
      .put(`/api/actividades/${e.id}/configuracion/espacio_equipo`)
      .set('Cookie', e.organizador.cookie)
      .send({ metas: 'opcional', avances: 'opcional', recursos: 'deshabilitado' })

    const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idEquipo, e.participantes[0].idMembresia, e.organizador.cookie)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })

    const respuesta = await crearElemento(idEquipo, e.participantes[0].cookie, 'recursos', 'x')
    expect(respuesta.status).toBe(409)
  })

  it('en formación ya se puede (el equipo existe desde ahí); en cierre ya no: 409', async () => {
    const e = await actividadEnFormacion(2)
    const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idEquipo, e.participantes[0].idMembresia, e.organizador.cookie)

    expect((await crearElemento(idEquipo, e.participantes[0].cookie, 'metas', 'x')).status).toBe(
      201,
    )

    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'cierre' } })
    expect((await crearElemento(idEquipo, e.participantes[0].cookie, 'avances', 'y')).status).toBe(
      409,
    )
  })
})

describe('GET /api/equipos/:id/elementos', () => {
  it('cualquier integrante ve el espacio de su equipo, filtrable por tipo', async () => {
    const e = await equipoEnDesarrollo()
    await crearElemento(e.idEquipo, e.participantes[0].cookie, 'metas', 'Meta 1')
    await crearElemento(e.idEquipo, e.participantes[1].cookie, 'avances', 'Avance 1')

    const todos = await listarElementos(e.idEquipo, e.participantes[0].cookie)
    expect(todos.body.elementos).toHaveLength(2)

    const soloMetas = await listarElementos(e.idEquipo, e.participantes[1].cookie, 'metas')
    expect(soloMetas.body.elementos).toHaveLength(1)
    expect(soloMetas.body.elementos[0].tipo).toBe('metas')
  })

  it('el organizador ve el espacio de cualquier equipo, sin integrarlo', async () => {
    const e = await equipoEnDesarrollo()
    await crearElemento(e.idEquipo, e.participantes[0].cookie, 'metas', 'Meta 1')

    const respuesta = await listarElementos(e.idEquipo, e.organizador.cookie)
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.elementos).toHaveLength(1)
  })

  it('un participante que no integra el equipo no puede verlo: 404', async () => {
    const e = await equipoEnDesarrollo()
    const sinEquipo = await registrar('Sara')
    await request(app).post(`/api/claves/${e.claveIngreso}/union`).set('Cookie', sinEquipo.cookie)

    const respuesta = await listarElementos(e.idEquipo, sinEquipo.cookie)
    expect(respuesta.status).toBe(404)
  })
})

describe('PATCH /api/elementos/:id', () => {
  it('cualquier integrante edita cualquier elemento, no solo el que creó', async () => {
    const e = await equipoEnDesarrollo()
    const creado = await crearElemento(e.idEquipo, e.participantes[0].cookie, 'metas', 'Original')

    const respuesta = await editarElemento(
      creado.body.elemento.id,
      e.participantes[1].cookie,
      'Editado por el otro integrante',
    )
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.elemento.contenido).toBe('Editado por el otro integrante')
  })

  it('registra elemento_modificado con el valor anterior y el nuevo', async () => {
    const e = await equipoEnDesarrollo()
    const creado = await crearElemento(e.idEquipo, e.participantes[0].cookie, 'metas', 'Original')
    await editarElemento(creado.body.elemento.id, e.participantes[0].cookie, 'Editado')

    const registrados = await eventos(e.id, 'elemento_modificado')
    expect(registrados).toHaveLength(1)
    expect(registrados[0].datos).toMatchObject({
      tipo: 'metas',
      antes: 'Original',
      despues: 'Editado',
    })
  })

  it('quien no integra el equipo no puede editar: 404 si no es miembro de la actividad, 403 si sí', async () => {
    const e = await equipoEnDesarrollo()
    const creado = await crearElemento(e.idEquipo, e.participantes[0].cookie, 'metas', 'x')

    const respuestaOrganizador = await editarElemento(
      creado.body.elemento.id,
      e.organizador.cookie,
      'y',
    )
    expect(respuestaOrganizador.status).toBe(403)
  })
})

describe('DELETE /api/elementos/:id', () => {
  it('elimina el elemento y el evento conserva el contenido íntegro', async () => {
    const e = await equipoEnDesarrollo()
    const creado = await crearElemento(
      e.idEquipo,
      e.participantes[0].cookie,
      'recursos',
      'Contenido a conservar',
    )

    const respuesta = await eliminarElemento(creado.body.elemento.id, e.participantes[1].cookie)
    expect(respuesta.status).toBe(204)

    const sigue = await prisma.elementoEspacioEquipo.findUnique({
      where: { idElemento: creado.body.elemento.id },
    })
    expect(sigue).toBeNull()

    const registrados = await eventos(e.id, 'elemento_eliminado')
    expect(registrados).toHaveLength(1)
    expect(registrados[0].datos).toMatchObject({
      tipo: 'recursos',
      contenido: 'Contenido a conservar',
    })
  })
})

describe('ajustar_funciones: espacio_equipo con contenido', () => {
  it('no se puede deshabilitar metas una vez que algún equipo tiene una, 422', async () => {
    const e = await equipoEnDesarrollo()
    await crearElemento(e.idEquipo, e.participantes[0].cookie, 'metas', 'x')

    const respuesta = await request(app)
      .put(`/api/actividades/${e.id}/configuracion/espacio_equipo`)
      .set('Cookie', e.organizador.cookie)
      .send({ metas: 'deshabilitado', avances: 'opcional', recursos: 'opcional' })

    expect(respuesta.status).toBe(422)
  })

  it('habilitar un elemento todavía deshabilitado sigue siendo libre, aunque otro ya tenga contenido', async () => {
    const e = await actividadEnFormacion(2)
    // Antes de desarrollo, deshabilitar recursos es libre (configurar_funciones).
    expect(
      (
        await request(app)
          .put(`/api/actividades/${e.id}/configuracion/espacio_equipo`)
          .set('Cookie', e.organizador.cookie)
          .send({ metas: 'opcional', avances: 'opcional', recursos: 'deshabilitado' })
      ).status,
    ).toBe(200)

    const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idEquipo, e.participantes[0].idMembresia, e.organizador.cookie)
    await asignar(idEquipo, e.participantes[1].idMembresia, e.organizador.cookie)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
    await crearElemento(idEquipo, e.participantes[0].cookie, 'metas', 'x')

    // En desarrollo: habilitar recursos (deshabilitado → opcional) es libre
    // aunque metas ya tenga contenido.
    const respuesta = await request(app)
      .put(`/api/actividades/${e.id}/configuracion/espacio_equipo`)
      .set('Cookie', e.organizador.cookie)
      .send({ metas: 'opcional', avances: 'opcional', recursos: 'opcional' })

    expect(respuesta.status).toBe(200)
  })
})
