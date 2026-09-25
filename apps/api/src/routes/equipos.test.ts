import request, { type Response } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'
import { proponerEquipos } from '../utilidades/reparto.js'

// Integración contra Postgres real (docs/diseno-desarrollo-nucleo.md §12.2).
// Cubre los endpoints de §8.6, sus reglas de integridad (general §4.6), la
// transición Formación → Desarrollo de §7.4 y el evento del historial de cada
// escritura. Las fases posteriores a desarrollo se fijan escribiendo el estado
// directamente: aún no existen las transiciones que llevan a ellas.

const app = createApp()

const DATOS_ACTIVIDAD = {
  nombre: 'Proyecto de ecosistemas',
  objetivo: 'Investigar el impacto humano en un ecosistema local.',
  informacionGeneral: 'Reporte escrito más presentación de 10 minutos.',
  fechaInicio: '2026-09-10',
  fechaTermino: '2026-11-01',
  fechaLimiteInscripcion: '2026-09-15',
  plazoCierreDias: 10,
  numeroEquiposEsperado: 3,
}

function extraerCookie(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((valor) => valor.startsWith('sesion='))
  if (!cookie) throw new Error('la respuesta no trae cookie de sesión')
  return cookie.split(';')[0]
}

// El correo lleva un contador: una prueba puede crear varias actividades y
// el correo es único.
let contadorCorreos = 0

async function registrar(nombre: string): Promise<{ cookie: string; idUsuario: string }> {
  const respuesta = await request(app)
    .post('/api/usuarios')
    .send({
      nombre,
      apellidoPaterno: 'Prueba',
      apellidoMaterno: 'Equipos',
      nivelEstudios: 'Licenciatura',
      institucionEducativa: 'UNAM',
      correo: `${nombre.toLowerCase()}${(contadorCorreos += 1)}@ejemplo.com`,
      contrasena: 'contrasena-larga',
    })
  return { cookie: extraerCookie(respuesta), idUsuario: respuesta.body.usuario.idUsuario }
}

interface Persona {
  cookie: string
  idUsuario: string
  idMembresia: string
  nombre: string
}

interface Escenario {
  id: string
  claveIngreso: string
  organizador: Persona
  participantes: Persona[]
}

async function idMembresiaDe(idActividad: string, idUsuario: string): Promise<string> {
  const m = await prisma.membresia.findFirstOrThrow({ where: { idActividad, idUsuario } })
  return m.idMembresia
}

// Actividad con n participantes unidos, todavía en inscripción.
async function actividadConParticipantes(n: number): Promise<Escenario> {
  const organizador = await registrar('Olga')
  const creada = await request(app)
    .post('/api/actividades')
    .set('Cookie', organizador.cookie)
    .send(DATOS_ACTIVIDAD)
  const id: string = creada.body.actividad.id
  const claveIngreso: string = creada.body.actividad.claveIngreso

  const participantes: Persona[] = []
  for (let i = 1; i <= n; i += 1) {
    const nombre = `Pablo${i}`
    const { cookie, idUsuario } = await registrar(nombre)
    const union = await request(app).post(`/api/claves/${claveIngreso}/union`).set('Cookie', cookie)
    expect(union.status).toBe(201)
    participantes.push({
      cookie,
      idUsuario,
      nombre,
      idMembresia: await idMembresiaDe(id, idUsuario),
    })
  }

  return {
    id,
    claveIngreso,
    organizador: {
      ...organizador,
      nombre: 'Olga',
      idMembresia: await idMembresiaDe(id, organizador.idUsuario),
    },
    participantes,
  }
}

// Igual, pero con la inscripción cerrada: la actividad está en formación.
async function actividadEnFormacion(n: number): Promise<Escenario> {
  const escenario = await actividadConParticipantes(n)
  const cierre = await request(app)
    .post(`/api/actividades/${escenario.id}/inscripcion/cierre`)
    .set('Cookie', escenario.organizador.cookie)
  expect(cierre.status).toBe(200)
  return escenario
}

async function fijarFormacion(e: Escenario, estado: string) {
  const respuesta = await request(app)
    .put(`/api/actividades/${e.id}/configuracion/formacion_equipos`)
    .set('Cookie', e.organizador.cookie)
    .send({ estado })
  expect(respuesta.status).toBe(200)
}

const crear = (id: string, cookie: string, nombre: string) =>
  request(app).post(`/api/actividades/${id}/equipos`).set('Cookie', cookie).send({ nombre })

const asignar = (idEquipo: string, idMembresia: string, cookie: string) =>
  request(app).put(`/api/equipos/${idEquipo}/integrantes/${idMembresia}`).set('Cookie', cookie)

const listar = (id: string, cookie: string) =>
  request(app).get(`/api/actividades/${id}/equipos`).set('Cookie', cookie)

const cerrarFormacion = (id: string, cookie: string) =>
  request(app).post(`/api/actividades/${id}/formacion/cierre`).set('Cookie', cookie)

async function estadoDe(id: string) {
  return (await prisma.actividad.findUniqueOrThrow({ where: { idActividad: id } })).estado
}

function eventos(idActividad: string, tipoEvento: string) {
  return prisma.historial.findMany({
    where: { idActividad, tipoEvento },
    orderBy: { fecha: 'asc' },
  })
}

async function idEquipoCreado(id: string, cookie: string, nombre: string): Promise<string> {
  const respuesta = await crear(id, cookie, nombre)
  expect(respuesta.status).toBe(201)
  return respuesta.body.equipo.id
}

beforeEach(async () => {
  await prisma.membresia.deleteMany()
  await prisma.actividad.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /api/actividades/:id/equipos', () => {
  it('lista los equipos y a quienes quedan sin equipo; todo miembro lo ve', async () => {
    const e = await actividadEnFormacion(3)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)

    for (const persona of [e.organizador, e.participantes[2]]) {
      const respuesta = await listar(e.id, persona.cookie)
      expect(respuesta.status).toBe(200)
      expect(respuesta.body.idMiMembresia).toBe(persona.idMembresia)
      expect(respuesta.body.equipos).toHaveLength(1)
      expect(respuesta.body.equipos[0]).toMatchObject({
        nombre: 'Alfa',
        descripcionActividad: null,
        formaDeTrabajo: null,
        integrantes: [{ idMembresia: e.participantes[0].idMembresia, rol: 'participante' }],
      })
      expect(respuesta.body.sinEquipo.map((p: { nombre: string }) => p.nombre)).toEqual([
        'Pablo2 Prueba',
        'Pablo3 Prueba',
      ])
    }
  })

  it('responde 404 a quien no es miembro y 401 sin sesión', async () => {
    const e = await actividadEnFormacion(1)
    const ajena = await registrar('Ajena')
    expect((await listar(e.id, ajena.cookie)).status).toBe(404)
    expect((await request(app).get(`/api/actividades/${e.id}/equipos`)).status).toBe(401)
  })

  it('lista los equipos en orden de creación', async () => {
    const e = await actividadEnFormacion(1)
    for (const nombre of ['Zeta', 'Beta', 'Alfa']) {
      await idEquipoCreado(e.id, e.organizador.cookie, nombre)
    }
    const respuesta = await listar(e.id, e.organizador.cookie)
    expect(respuesta.body.equipos.map((x: { nombre: string }) => x.nombre)).toEqual([
      'Zeta',
      'Beta',
      'Alfa',
    ])
  })
})

describe('POST /api/actividades/:id/equipos', () => {
  it('quien organiza crea el equipo sin pertenecer a él, y se registra el evento', async () => {
    const e = await actividadEnFormacion(2)
    const respuesta = await crear(e.id, e.organizador.cookie, '  Alfa  ')

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.equipo).toMatchObject({ nombre: 'Alfa', integrantes: [] })
    expect(respuesta.headers.location).toBe(`/api/equipos/${respuesta.body.equipo.id}`)

    const creados = await eventos(e.id, 'equipo_creado')
    expect(creados).toHaveLength(1)
    expect(creados[0]).toMatchObject({
      tipoActor: 'usuario',
      idUsuarioActor: e.organizador.idUsuario,
      categoria: 'estructura',
      tipoEntidad: 'equipo',
      idEntidad: respuesta.body.equipo.id,
      datos: { nombre: 'Alfa' },
    })
    expect(await eventos(e.id, 'integrante_asignado')).toHaveLength(0)
  })

  it('un participante con la formación autogestionada crea un equipo y queda dentro', async () => {
    const e = await actividadEnFormacion(2)
    const respuesta = await crear(e.id, e.participantes[0].cookie, 'Alfa')

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.equipo.integrantes).toEqual([
      { idMembresia: e.participantes[0].idMembresia, nombre: 'Pablo1 Prueba', rol: 'participante' },
    ])
    expect(await eventos(e.id, 'equipo_creado')).toHaveLength(1)
    expect(await eventos(e.id, 'integrante_asignado')).toHaveLength(1)
  })

  it('un participante que ya estaba en un equipo se mueve al nuevo', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.participantes[0].cookie, 'Alfa')
    await crear(e.id, e.participantes[0].cookie, 'Beta')

    const lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.equipos.find((x: { id: string }) => x.id === idA).integrantes).toEqual([])
    expect(lista.equipos[1].integrantes).toHaveLength(1)
  })

  it('un participante no puede crear equipos si la función es manual o de propuesta', async () => {
    for (const estado of ['manual', 'propuesta_sistema']) {
      const e = await actividadEnFormacion(2)
      await fijarFormacion(e, estado)
      const respuesta = await crear(e.id, e.participantes[0].cookie, 'Alfa')
      expect(respuesta.status, estado).toBe(409)
      expect(respuesta.body.codigo).toBe('fase_no_permite_accion')
      await prisma.actividad.deleteMany()
    }
  })

  it('no permite crear equipos fuera de la formación', async () => {
    const e = await actividadConParticipantes(1)
    expect((await crear(e.id, e.organizador.cookie, 'Alfa')).status).toBe(409)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
    expect((await crear(e.id, e.organizador.cookie, 'Alfa')).status).toBe(409)
  })

  it('rechaza un nombre repetido sin distinguir mayúsculas, y no deja evento de más', async () => {
    const e = await actividadEnFormacion(1)
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const respuesta = await crear(e.id, e.organizador.cookie, 'ALFA')

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.codigo).toBe('nombre_equipo_duplicado')
    expect(await eventos(e.id, 'equipo_creado')).toHaveLength(1)
    expect(await prisma.equipo.count({ where: { idActividad: e.id } })).toBe(1)
  })

  it('el mismo nombre puede existir en otra actividad', async () => {
    const a = await actividadEnFormacion(1)
    const b = await actividadEnFormacion(1)
    await idEquipoCreado(a.id, a.organizador.cookie, 'Alfa')
    expect((await crear(b.id, b.organizador.cookie, 'Alfa')).status).toBe(201)
  })

  it('valida el nombre con 400 y detalle por campo', async () => {
    const e = await actividadEnFormacion(1)
    const respuesta = await crear(e.id, e.organizador.cookie, '   ')
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.nombre).toBeDefined()
  })

  it('un co-organizador con el permiso gestionar_equipos crea; sin él, 403', async () => {
    const e = await actividadEnFormacion(1)
    await fijarFormacion(e, 'manual')
    const con = await registrar('Con')
    const sin = await registrar('Sin')
    for (const [persona, permisos] of [
      [con, ['gestionar_equipos']],
      [sin, ['configurar_actividad']],
    ] as const) {
      const r = await request(app)
        .put(`/api/actividades/${e.id}/coorganizadores/${persona.idUsuario}`)
        .set('Cookie', e.organizador.cookie)
        .send({ permisos })
      expect(r.status).toBe(200)
    }

    expect((await crear(e.id, con.cookie, 'Alfa')).status).toBe(201)
    const rechazo = await crear(e.id, sin.cookie, 'Beta')
    expect(rechazo.status).toBe(403)
    expect(rechazo.body.codigo).toBe('accion_no_permitida')
  })

  it('responde 404 a quien no es miembro', async () => {
    const e = await actividadEnFormacion(1)
    const ajena = await registrar('Ajena')
    expect((await crear(e.id, ajena.cookie, 'Alfa')).status).toBe(404)
  })
})

describe('PUT /api/equipos/:id/integrantes/:idMembresia', () => {
  it('quien organiza asigna y mueve, y el evento guarda el equipo anterior', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const idB = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')

    const primera = await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    expect(primera.status).toBe(200)
    const movida = await asignar(idB, e.participantes[0].idMembresia, e.organizador.cookie)
    expect(movida.body.equipo.integrantes).toHaveLength(1)

    const lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.equipos[0].integrantes).toEqual([])

    const asignados = await eventos(e.id, 'integrante_asignado')
    expect(asignados).toHaveLength(2)
    expect(asignados[0].datos).toMatchObject({
      equipoAnterior: null,
      equipoNuevo: { id: idA, nombre: 'Alfa' },
    })
    expect(asignados[1].datos).toMatchObject({
      equipoAnterior: { id: idA, nombre: 'Alfa' },
      equipoNuevo: { id: idB, nombre: 'Beta' },
    })
  })

  it('asignar a quien ya está en ese equipo no escribe nada ni registra evento', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    const repetida = await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    expect(repetida.status).toBe(200)
    expect(await eventos(e.id, 'integrante_asignado')).toHaveLength(1)
  })

  it('un participante se mueve a sí mismo con la formación autogestionada', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const respuesta = await asignar(idA, e.participantes[0].idMembresia, e.participantes[0].cookie)
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.equipo.integrantes).toHaveLength(1)
  })

  it('un participante no puede asignar a otra persona: 403', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const respuesta = await asignar(idA, e.participantes[1].idMembresia, e.participantes[0].cookie)
    expect(respuesta.status).toBe(403)
    expect(await eventos(e.id, 'integrante_asignado')).toHaveLength(0)
  })

  it('un participante no puede elegir equipo si la función es manual: 409', async () => {
    const e = await actividadEnFormacion(2)
    await fijarFormacion(e, 'manual')
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const respuesta = await asignar(idA, e.participantes[0].idMembresia, e.participantes[0].cookie)
    expect(respuesta.status).toBe(409)
  })

  it('la asignación es de quien gestiona equipos también en desarrollo, y no en cierre', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
    expect((await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)).status).toBe(
      200,
    )
    // En desarrollo el participante ya no elige: solo la gestión mueve.
    expect(
      (await asignar(idA, e.participantes[1].idMembresia, e.participantes[1].cookie)).status,
    ).toBe(409)

    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'cierre' } })
    expect((await asignar(idA, e.participantes[1].idMembresia, e.organizador.cookie)).status).toBe(
      409,
    )
  })

  it('rechaza una membresía de otra actividad, una inexistente y una desactivada: 422', async () => {
    const e = await actividadEnFormacion(2)
    const otra = await actividadEnFormacion(1)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')

    for (const idMembresia of [otra.participantes[0].idMembresia, crypto.randomUUID()]) {
      const r = await asignar(idA, idMembresia, e.organizador.cookie)
      expect(r.status).toBe(422)
      expect(r.body.codigo).toBe('miembro_no_asignable')
    }

    await prisma.membresia.update({
      where: { idMembresia: e.participantes[0].idMembresia },
      data: { estado: 'desactivada' },
    })
    const desactivada = await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    expect(desactivada.status).toBe(422)
    expect(await prisma.integranteEquipo.count()).toBe(0)
  })

  it('quien organiza puede integrar un equipo; no está obligado ni bloquea la formación', async () => {
    const e = await actividadEnFormacion(1)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const respuesta = await asignar(idA, e.organizador.idMembresia, e.organizador.cookie)
    expect(respuesta.body.equipo.integrantes).toEqual([
      { idMembresia: e.organizador.idMembresia, nombre: 'Olga Prueba', rol: 'organizador' },
    ])
    // El organizador no cuenta como "sin equipo" y los participantes siguen pendientes.
    const lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.sinEquipo).toHaveLength(1)
    expect(await estadoDe(e.id)).toBe('formacion_equipos')
  })

  it('responde 404 a quien no es miembro de la actividad del equipo, igual que a un equipo inexistente', async () => {
    const e = await actividadEnFormacion(1)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const ajena = await registrar('Ajena')

    const ajeno = await asignar(idA, e.participantes[0].idMembresia, ajena.cookie)
    const inexistente = await asignar(
      crypto.randomUUID(),
      e.participantes[0].idMembresia,
      ajena.cookie,
    )
    expect(ajeno.status).toBe(404)
    expect(inexistente.status).toBe(404)
    expect(ajeno.body).toEqual(inexistente.body)
  })
})

describe('DELETE /api/equipos/:id/integrantes/:idMembresia', () => {
  it('quien organiza sale de un equipo, y es idempotente', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.organizador.idMembresia, e.organizador.cookie)

    const salir = () =>
      request(app)
        .delete(`/api/equipos/${idA}/integrantes/${e.organizador.idMembresia}`)
        .set('Cookie', e.organizador.cookie)
    const respuesta = await salir()
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.equipo.integrantes).toHaveLength(0)
    const retirados = await eventos(e.id, 'integrante_retirado')
    expect(retirados).toHaveLength(1)
    expect(retirados[0].datos).toMatchObject({ nombre: 'Olga Prueba' })

    await salir()
    expect(await eventos(e.id, 'integrante_retirado')).toHaveLength(1)
  })

  it('durante la formación también se puede quitar a un participante: queda sin equipo', async () => {
    const e = await actividadEnFormacion(3)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)

    const respuesta = await request(app)
      .delete(`/api/equipos/${idA}/integrantes/${e.participantes[0].idMembresia}`)
      .set('Cookie', e.organizador.cookie)
    expect(respuesta.status).toBe(200)
    expect((await listar(e.id, e.organizador.cookie)).body.sinEquipo).toHaveLength(3)
  })

  it('en desarrollo un participante ya no se retira, solo se mueve: 422', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })

    const respuesta = await request(app)
      .delete(`/api/equipos/${idA}/integrantes/${e.participantes[0].idMembresia}`)
      .set('Cookie', e.organizador.cookie)
    expect(respuesta.status).toBe(422)
    expect(respuesta.body.codigo).toBe('participante_requiere_equipo')
  })

  it('un participante no puede quitar a otros: 403', async () => {
    const e = await actividadEnFormacion(3)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[1].idMembresia, e.organizador.cookie)
    const respuesta = await request(app)
      .delete(`/api/equipos/${idA}/integrantes/${e.participantes[1].idMembresia}`)
      .set('Cookie', e.participantes[0].cookie)
    expect(respuesta.status).toBe(403)
  })
})

describe('PATCH /api/equipos/:id', () => {
  it('un integrante edita su equipo y el evento guarda valor anterior y nuevo', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.participantes[0].cookie, 'Alfa')

    const respuesta = await request(app)
      .patch(`/api/equipos/${idA}`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ nombre: 'Alfa 2', formaDeTrabajo: 'Reunión semanal' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.equipo).toMatchObject({
      nombre: 'Alfa 2',
      formaDeTrabajo: 'Reunión semanal',
    })
    const modificados = await eventos(e.id, 'equipo_modificado')
    expect(modificados).toHaveLength(1)
    expect(modificados[0].datos).toMatchObject({
      antes: { nombre: 'Alfa', formaDeTrabajo: null },
      despues: { nombre: 'Alfa 2', formaDeTrabajo: 'Reunión semanal' },
    })
  })

  it('un participante no edita el equipo de otros: 403; quien organiza edita cualquiera', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.participantes[0].cookie, 'Alfa')

    const ajeno = await request(app)
      .patch(`/api/equipos/${idA}`)
      .set('Cookie', e.participantes[1].cookie)
      .send({ nombre: 'Robado' })
    expect(ajeno.status).toBe(403)

    const organizador = await request(app)
      .patch(`/api/equipos/${idA}`)
      .set('Cookie', e.organizador.cookie)
      .send({ descripcionActividad: 'Mapear el humedal' })
    expect(organizador.status).toBe(200)
  })

  it('un cambio que no cambia nada no registra evento; un nombre repetido da 409', async () => {
    const e = await actividadEnFormacion(1)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')

    const igual = await request(app)
      .patch(`/api/equipos/${idA}`)
      .set('Cookie', e.organizador.cookie)
      .send({ nombre: 'Alfa' })
    expect(igual.status).toBe(200)
    expect(await eventos(e.id, 'equipo_modificado')).toHaveLength(0)

    const repetido = await request(app)
      .patch(`/api/equipos/${idA}`)
      .set('Cookie', e.organizador.cookie)
      .send({ nombre: 'beta' })
    expect(repetido.status).toBe(409)
  })

  it('el equipo puede editarse hasta el cierre, no en una actividad archivada', async () => {
    const e = await actividadEnFormacion(1)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const editar = () =>
      request(app)
        .patch(`/api/equipos/${idA}`)
        .set('Cookie', e.organizador.cookie)
        .send({ formaDeTrabajo: crypto.randomUUID() })

    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'cierre' } })
    expect((await editar()).status).toBe(200)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'archivada' } })
    expect((await editar()).status).toBe(409)
  })
})

describe('DELETE /api/equipos/:id', () => {
  it('elimina un equipo vacío y el evento conserva lo eliminado', async () => {
    const e = await actividadEnFormacion(1)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await request(app)
      .patch(`/api/equipos/${idA}`)
      .set('Cookie', e.organizador.cookie)
      .send({ descripcionActividad: 'Mapear el humedal' })

    const respuesta = await request(app)
      .delete(`/api/equipos/${idA}`)
      .set('Cookie', e.organizador.cookie)
    expect(respuesta.status).toBe(204)

    const eliminados = await eventos(e.id, 'equipo_eliminado')
    expect(eliminados).toHaveLength(1)
    expect(eliminados[0].datos).toMatchObject({
      nombre: 'Alfa',
      descripcionActividad: 'Mapear el humedal',
    })
    expect((await listar(e.id, e.organizador.cookie)).body.equipos).toEqual([])
  })

  it('elimina un equipo con integrantes: quedan sin equipo y el evento los conserva', async () => {
    const e = await actividadEnFormacion(3)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    await asignar(idA, e.participantes[1].idMembresia, e.organizador.cookie)

    const respuesta = await request(app)
      .delete(`/api/equipos/${idA}`)
      .set('Cookie', e.organizador.cookie)
    expect(respuesta.status).toBe(204)

    const lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.equipos).toEqual([])
    expect(lista.sinEquipo).toHaveLength(3)
    expect(await prisma.integranteEquipo.count()).toBe(0)

    const [eliminado] = await eventos(e.id, 'equipo_eliminado')
    expect(eliminado.datos).toMatchObject({
      nombre: 'Alfa',
      integrantes: [
        { idMembresia: e.participantes[0].idMembresia, nombre: 'Pablo1 Prueba' },
        { idMembresia: e.participantes[1].idMembresia, nombre: 'Pablo2 Prueba' },
      ],
    })
  })

  it('solo durante la formación: en desarrollo no se elimina, 409', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
    const respuesta = await request(app)
      .delete(`/api/equipos/${idA}`)
      .set('Cookie', e.organizador.cookie)
    expect(respuesta.status).toBe(409)
  })

  it('un participante no elimina equipos: 403', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.participantes[0].cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    const respuesta = await request(app)
      .delete(`/api/equipos/${idA}`)
      .set('Cookie', e.participantes[0].cookie)
    expect(respuesta.status).toBe(403)
  })
})

describe('membresía desactivada con equipo', () => {
  it('conserva su fila pero no aparece ni cuenta; al reactivarla vuelve a su equipo', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)

    await prisma.membresia.update({
      where: { idMembresia: e.participantes[0].idMembresia },
      data: { estado: 'desactivada' },
    })
    let lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.equipos[0].integrantes).toEqual([])
    expect(lista.sinEquipo.map((p: { idMembresia: string }) => p.idMembresia)).toEqual([
      e.participantes[1].idMembresia,
    ])
    expect(await prisma.integranteEquipo.count()).toBe(1)

    await prisma.membresia.update({
      where: { idMembresia: e.participantes[0].idMembresia },
      data: { estado: 'activa' },
    })
    lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.equipos[0].integrantes).toHaveLength(1)
  })

  it('no impide la transición automática ni recibe reparto', async () => {
    const e = await actividadEnFormacion(2)
    await prisma.membresia.update({
      where: { idMembresia: e.participantes[1].idMembresia },
      data: { estado: 'desactivada' },
    })
    await crear(e.id, e.participantes[0].cookie, 'Alfa')
    expect(await estadoDe(e.id)).toBe('desarrollo')
    expect(await prisma.integranteEquipo.count()).toBe(1)
  })
})

describe('promoción a co-organizador', () => {
  it('quien ya estaba en un equipo conserva su lugar como co-organizador', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)

    const promocion = await request(app)
      .put(`/api/actividades/${e.id}/coorganizadores/${e.participantes[0].idUsuario}`)
      .set('Cookie', e.organizador.cookie)
      .send({})
    expect(promocion.status).toBe(200)

    const lista = (await listar(e.id, e.organizador.cookie)).body
    expect(lista.equipos[0].integrantes).toEqual([
      expect.objectContaining({
        idMembresia: e.participantes[0].idMembresia,
        rol: 'co-organizador',
      }),
    ])
    expect(lista.sinEquipo.map((p: { idMembresia: string }) => p.idMembresia)).toEqual([
      e.participantes[1].idMembresia,
    ])
  })
})

describe('POST /api/actividades/:id/formacion/cierre', () => {
  it('sin ningún equipo se impide, con explicación: 422', async () => {
    const e = await actividadEnFormacion(2)
    const respuesta = await cerrarFormacion(e.id, e.organizador.cookie)
    expect(respuesta.status).toBe(422)
    expect(respuesta.body.codigo).toBe('sin_equipos')
    expect(await estadoDe(e.id)).toBe('formacion_equipos')
  })

  it('reparte a quienes quedaron sin equipo, con un solo evento del sistema, y pasa a desarrollo', async () => {
    const e = await actividadEnFormacion(5)
    await fijarFormacion(e, 'manual')
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)

    const respuesta = await cerrarFormacion(e.id, e.organizador.cookie)
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.actividad.fase).toBe('desarrollo')

    // Alfa tenía 1, Beta 0: Pablo2→Beta, Pablo3→Beta (1=1: empate, gana Alfa), ...
    const lista = (await listar(e.id, e.organizador.cookie)).body
    const tamanos = lista.equipos.map((x: { integrantes: unknown[] }) => x.integrantes.length)
    expect(tamanos).toEqual([3, 2])
    expect(lista.sinEquipo).toEqual([])

    const repartos = await eventos(e.id, 'reparto_automatico')
    expect(repartos).toHaveLength(1)
    expect(repartos[0]).toMatchObject({ tipoActor: 'sistema', idUsuarioActor: null })
    expect(
      (
        repartos[0].datos as { asignaciones: { idMembresia: string; nombreEquipo: string }[] }
      ).asignaciones.map((a) => [a.idMembresia, a.nombreEquipo]),
    ).toEqual([
      [e.participantes[1].idMembresia, 'Beta'],
      [e.participantes[2].idMembresia, 'Alfa'],
      [e.participantes[3].idMembresia, 'Beta'],
      [e.participantes[4].idMembresia, 'Alfa'],
    ])

    const fases = await eventos(e.id, 'fase_avanzada')
    expect(fases.at(-1)).toMatchObject({
      tipoActor: 'usuario',
      idUsuarioActor: e.organizador.idUsuario,
    })
    expect(fases.at(-1)?.datos).toMatchObject({
      faseOrigen: 'formacion_equipos',
      faseDestino: 'desarrollo',
      disparadoPor: 'usuario',
    })
  })

  it('sin nadie sin equipo no hay evento de reparto; con la función en propuesta también cierra', async () => {
    const e = await actividadEnFormacion(1)
    await fijarFormacion(e, 'propuesta_sistema')
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)

    expect((await cerrarFormacion(e.id, e.organizador.cookie)).status).toBe(200)
    expect(await eventos(e.id, 'reparto_automatico')).toHaveLength(0)
    expect(await estadoDe(e.id)).toBe('desarrollo')
  })

  it('con la función autogestionada, quien organiza puede cerrar antes de que todos elijan', async () => {
    const e = await actividadEnFormacion(3)
    await crear(e.id, e.participantes[0].cookie, 'Alfa')
    expect(await estadoDe(e.id)).toBe('formacion_equipos')

    expect((await cerrarFormacion(e.id, e.organizador.cookie)).status).toBe(200)
    expect((await listar(e.id, e.organizador.cookie)).body.sinEquipo).toEqual([])
    expect(await prisma.integranteEquipo.count()).toBe(3)
  })

  it('un participante no puede cerrar la formación: 403', async () => {
    const e = await actividadEnFormacion(1)
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const respuesta = await cerrarFormacion(e.id, e.participantes[0].cookie)
    expect(respuesta.status).toBe(403)
    expect(await estadoDe(e.id)).toBe('formacion_equipos')
  })

  it('una transición no se ejecuta dos veces ni desde otra fase: 409', async () => {
    const e = await actividadEnFormacion(1)
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    expect((await cerrarFormacion(e.id, e.organizador.cookie)).status).toBe(200)
    expect((await cerrarFormacion(e.id, e.organizador.cookie)).status).toBe(409)

    const enInscripcion = await actividadConParticipantes(1)
    expect((await cerrarFormacion(enInscripcion.id, enInscripcion.organizador.cookie)).status).toBe(
      409,
    )
  })

  it('un co-organizador necesita gestionar_equipos', async () => {
    const e = await actividadEnFormacion(1)
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const sin = await registrar('Sin')
    await request(app)
      .put(`/api/actividades/${e.id}/coorganizadores/${sin.idUsuario}`)
      .set('Cookie', e.organizador.cookie)
      .send({ permisos: ['configurar_actividad'] })
    expect((await cerrarFormacion(e.id, sin.cookie)).status).toBe(403)
  })
})

describe('transición automática con la formación autogestionada', () => {
  it('pasa a desarrollo en cuanto nadie queda sin equipo, con el sistema como actor', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.participantes[0].cookie, 'Alfa')
    expect(await estadoDe(e.id)).toBe('formacion_equipos')

    const ultima = await asignar(idA, e.participantes[1].idMembresia, e.participantes[1].cookie)
    expect(ultima.status).toBe(200)
    expect(await estadoDe(e.id)).toBe('desarrollo')

    const fases = await eventos(e.id, 'fase_avanzada')
    expect(fases.at(-1)).toMatchObject({ tipoActor: 'sistema', idUsuarioActor: null })
    expect(fases.at(-1)?.datos).toMatchObject({
      faseDestino: 'desarrollo',
      disparadoPor: 'sistema',
      motivo: 'sin_rezagados',
    })
    expect(await eventos(e.id, 'reparto_automatico')).toHaveLength(0)
  })

  it('con un solo participante, crear su equipo lo pasa a desarrollo', async () => {
    const e = await actividadEnFormacion(1)
    await crear(e.id, e.participantes[0].cookie, 'Solo')
    expect(await estadoDe(e.id)).toBe('desarrollo')
  })

  it('también cuenta cuando quien organiza es quien completa las asignaciones', async () => {
    const e = await actividadEnFormacion(2)
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    await asignar(idA, e.participantes[1].idMembresia, e.organizador.cookie)
    expect(await estadoDe(e.id)).toBe('desarrollo')
  })

  it('no ocurre con la función en manual ni en propuesta_sistema: el cierre es siempre una acción', async () => {
    for (const estado of ['manual', 'propuesta_sistema']) {
      const e = await actividadEnFormacion(1)
      await fijarFormacion(e, estado)
      const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
      await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
      expect(await estadoDe(e.id), estado).toBe('formacion_equipos')
      await prisma.actividad.deleteMany()
    }
  })

  it('cambiar la función a autogestionada no dispara la transición por sí solo', async () => {
    const e = await actividadEnFormacion(1)
    await fijarFormacion(e, 'manual')
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.participantes[0].idMembresia, e.organizador.cookie)
    await fijarFormacion(e, 'autogestionado')
    expect(await estadoDe(e.id)).toBe('formacion_equipos')
  })

  it('dos participantes que completan a la vez producen una sola transición', async () => {
    const e = await actividadEnFormacion(2)
    const [a, b] = await Promise.all([
      crear(e.id, e.participantes[0].cookie, 'Alfa'),
      crear(e.id, e.participantes[1].cookie, 'Beta'),
    ])
    expect([a.status, b.status]).toEqual([201, 201])
    expect(await estadoDe(e.id)).toBe('desarrollo')

    const automaticas = (await eventos(e.id, 'fase_avanzada')).filter(
      (ev) => (ev.datos as { faseDestino?: string }).faseDestino === 'desarrollo',
    )
    expect(automaticas).toHaveLength(1)
  })

  it('en desarrollo el participante ya no elige equipo: 409', async () => {
    const e = await actividadEnFormacion(1)
    await crear(e.id, e.participantes[0].cookie, 'Solo')
    const otra = await crear(e.id, e.participantes[0].cookie, 'Otro')
    expect(otra.status).toBe(409)
  })
})

describe('una actividad creada por un estudiante con el profesor como co-organizador', () => {
  it('funciona con las mismas reglas, sin ningún código ni bandera especial', async () => {
    // "Autogestionada" no es un tipo: quien crea es el organizador, agrega a
    // quien quiera como co-organizador y las funciones quedan como se
    // configuren. Aquí, la configuración por defecto (formación autogestionada).
    const e = await actividadEnFormacion(2)
    const profesor = await registrar('Profe')
    const alta = await request(app)
      .put(`/api/actividades/${e.id}/coorganizadores/${profesor.idUsuario}`)
      .set('Cookie', e.organizador.cookie)
      .send({})
    expect(alta.status).toBe(200)
    const idProfe = await idMembresiaDe(e.id, profesor.idUsuario)

    // El estudiante que organiza forma un equipo y se integra en él…
    const idA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idA, e.organizador.idMembresia, e.organizador.cookie)
    // …el profesor (permisos por defecto) reasigna a un participante…
    expect((await asignar(idA, e.participantes[0].idMembresia, profesor.cookie)).status).toBe(200)
    // …y el otro participante elige por su cuenta.
    expect(
      (await asignar(idA, e.participantes[1].idMembresia, e.participantes[1].cookie)).status,
    ).toBe(200)

    expect(await estadoDe(e.id)).toBe('desarrollo')
    const integrantes = (await listar(e.id, profesor.cookie)).body.equipos[0].integrantes
    expect(integrantes.map((i: { idMembresia: string }) => i.idMembresia).sort()).toEqual(
      [
        e.organizador.idMembresia,
        e.participantes[0].idMembresia,
        e.participantes[1].idMembresia,
      ].sort(),
    )
    expect(idProfe).toBeDefined()
  })
})

describe('capacidades en GET /api/actividades/:id', () => {
  it('siguen el estado de la función y la fase, para cada rol', async () => {
    const e = await actividadEnFormacion(1)
    const capacidades = async (cookie: string) =>
      (await request(app).get(`/api/actividades/${e.id}`).set('Cookie', cookie)).body.actividad
        .capacidades as string[]

    expect(await capacidades(e.participantes[0].cookie)).toEqual(['elegir_equipo', 'editar_equipo'])
    expect(await capacidades(e.organizador.cookie)).toEqual(
      expect.arrayContaining([
        'formar_equipos',
        'asignar_integrantes',
        'cerrar_formacion',
        'elegir_equipo',
        'editar_equipo',
      ]),
    )
    expect(await capacidades(e.organizador.cookie)).not.toContain('generar_propuesta_equipos')

    await fijarFormacion(e, 'manual')
    expect(await capacidades(e.participantes[0].cookie)).toEqual(['editar_equipo'])
  })
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
    await fijarFormacion(e, 'propuesta_sistema')
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
