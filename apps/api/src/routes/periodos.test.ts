import request, { type Response } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

const app = createApp()

const DATOS_REGISTRO = {
  nombre: 'Ada',
  apellidoPaterno: 'Lovelace',
  apellidoMaterno: 'Byron',
  nivelEstudios: 'Licenciatura',
  institucionEducativa: 'UNAM',
  correo: 'ada@ejemplo.com',
  contrasena: 'contrasena-larga',
}

// 2026-09-10 → 2026-11-01: ocho periodos semanales (el último recortado).
const DATOS_ACTIVIDAD = {
  nombre: 'Proyecto de ecosistemas',
  objetivo: 'Investigar el impacto humano en un ecosistema local.',
  informacionGeneral: 'Reporte escrito más presentación de 10 minutos.',
  fechaInicio: '2026-09-10',
  fechaTermino: '2026-11-01',
  fechaLimiteInscripcion: '2026-09-15',
  plazoCierreDias: 10,
  numeroEquiposEsperado: 4,
}

function extraerCookie(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((valor) => valor.startsWith('sesion='))
  if (!cookie) throw new Error('la respuesta no trae cookie de sesión')
  return cookie.split(';')[0]
}

async function registrarYObtenerCookie(correo: string): Promise<string> {
  const respuesta = await request(app)
    .post('/api/usuarios')
    .send({ ...DATOS_REGISTRO, correo })
  return extraerCookie(respuesta)
}

async function crearActividad(cookie: string): Promise<{ id: string; claveIngreso: string }> {
  const respuesta = await request(app)
    .post('/api/actividades')
    .set('Cookie', cookie)
    .send(DATOS_ACTIVIDAD)
  return { id: respuesta.body.actividad.id, claveIngreso: respuesta.body.actividad.claveIngreso }
}

async function unirseComoParticipante(clave: string, cookie: string): Promise<void> {
  const respuesta = await request(app).post(`/api/claves/${clave}/union`).set('Cookie', cookie)
  expect(respuesta.status).toBe(201)
}

async function generar(id: string, cookie: string, periodicidad = 'semanal') {
  return request(app)
    .put(`/api/actividades/${id}/periodos`)
    .set('Cookie', cookie)
    .send({ periodicidad })
}

async function ajustar(id: string, idPeriodo: string, cookie: string, cuerpo: object) {
  return request(app)
    .patch(`/api/actividades/${id}/periodos/${idPeriodo}`)
    .set('Cookie', cookie)
    .send(cuerpo)
}

interface Periodo {
  id: string
  orden: number
  fechaInicio: string
  fechaFin: string
  estado: string
}

// Organizador con una actividad ya calendarizada (8 periodos semanales).
async function actividadConCalendario() {
  const cookie = await registrarYObtenerCookie('ada@ejemplo.com')
  const { id, claveIngreso } = await crearActividad(cookie)
  const periodos = (await generar(id, cookie)).body.periodos as Periodo[]
  return { cookie, id, claveIngreso, periodos }
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

describe('GET /api/actividades/:id/periodos', () => {
  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).get('/api/actividades/cualquiera/periodos')
    expect(respuesta.status).toBe(401)
  })

  it('una actividad recién creada no tiene periodos', async () => {
    const cookie = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookie)

    const respuesta = await request(app)
      .get(`/api/actividades/${id}/periodos`)
      .set('Cookie', cookie)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.periodos).toEqual([])
  })

  it('cualquier miembro los consulta, no solo quien organiza', async () => {
    const { id, claveIngreso, periodos } = await actividadConCalendario()
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await request(app)
      .get(`/api/actividades/${id}/periodos`)
      .set('Cookie', cookieParticipante)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.periodos).toHaveLength(periodos.length)
  })

  it('responde 404 a quien no es miembro', async () => {
    const { id } = await actividadConCalendario()
    const cookieAjena = await registrarYObtenerCookie('ajena@ejemplo.com')

    const respuesta = await request(app)
      .get(`/api/actividades/${id}/periodos`)
      .set('Cookie', cookieAjena)

    expect(respuesta.status).toBe(404)
  })
})

describe('PUT /api/actividades/:id/periodos', () => {
  it('genera periodos semanales consecutivos entre el inicio y el término de la actividad', async () => {
    const cookie = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookie)

    const respuesta = await generar(id, cookie, 'semanal')

    expect(respuesta.status).toBe(200)
    const periodos = respuesta.body.periodos as Periodo[]
    expect(periodos).toHaveLength(8)
    expect(periodos[0]).toMatchObject({
      orden: 1,
      fechaInicio: '2026-09-10',
      fechaFin: '2026-09-16',
      estado: 'activo',
    })
    expect(periodos[7]).toMatchObject({
      orden: 8,
      fechaInicio: '2026-10-29',
      fechaFin: '2026-11-01',
    })

    const consulta = await request(app).get(`/api/actividades/${id}/periodos`).set('Cookie', cookie)
    expect(consulta.body.periodos).toEqual(periodos)
  })

  it('regenerar con otra periodicidad reemplaza el calendario y descarta los ajustes previos', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()
    await ajustar(id, periodos[0].id, cookie, { estado: 'cancelado' })

    const respuesta = await generar(id, cookie, 'mensual')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.periodos).toHaveLength(2)
    expect(respuesta.body.periodos.every((p: Periodo) => p.estado === 'activo')).toBe(true)
  })

  it("'ninguna' borra el calendario", async () => {
    const { cookie, id } = await actividadConCalendario()

    const respuesta = await generar(id, cookie, 'ninguna')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.periodos).toEqual([])
  })

  it('rechaza una periodicidad que no existe', async () => {
    const cookie = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookie)

    const respuesta = await generar(id, cookie, 'diaria')

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.periodicidad).toBeDefined()
  })

  it('rechaza una periodicidad que generaría demasiados periodos', async () => {
    const cookie = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookie)
    await prisma.actividad.update({
      where: { idActividad: id },
      data: { fechaTermino: new Date('2035-01-01T00:00:00.000Z') },
    })

    const respuesta = await generar(id, cookie, 'semanal')

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.periodicidad).toContain('120')
    expect(await prisma.periodoReporte.count()).toBe(0)
  })

  it('responde 403 a un participante', async () => {
    const { id, claveIngreso } = await actividadConCalendario()
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await generar(id, cookieParticipante, 'mensual')

    expect(respuesta.status).toBe(403)
    expect(respuesta.body.codigo).toBe('accion_no_permitida')
  })

  it('responde 409 una vez que la actividad está en desarrollo: regenerar descartaría los ajustes', async () => {
    const { cookie, id } = await actividadConCalendario()
    await prisma.actividad.update({ where: { idActividad: id }, data: { estado: 'desarrollo' } })

    const respuesta = await generar(id, cookie, 'mensual')

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.codigo).toBe('fase_no_permite_accion')
  })

  it('registra un evento de historial con la periodicidad y el número de periodos', async () => {
    const cookie = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookie)

    await generar(id, cookie, 'quincenal')

    const evento = await prisma.historial.findFirst({
      where: { idActividad: id, tipoEvento: 'periodos_definidos' },
    })
    expect(evento?.tipoActor).toBe('usuario')
    expect(evento?.datos).toEqual({ periodicidad: 'quincenal', numeroPeriodos: 4 })
  })
})

describe('PATCH /api/actividades/:id/periodos/:idPeriodo', () => {
  it('cancela un periodo, que sigue visible y conserva su orden, y lo reactiva', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()
    const tercero = periodos[2]

    const cancelado = await ajustar(id, tercero.id, cookie, { estado: 'cancelado' })
    expect(cancelado.status).toBe(200)
    expect(cancelado.body.periodo).toMatchObject({ orden: 3, estado: 'cancelado' })

    const consulta = await request(app).get(`/api/actividades/${id}/periodos`).set('Cookie', cookie)
    expect(consulta.body.periodos).toHaveLength(8)
    expect(consulta.body.periodos[2].estado).toBe('cancelado')
    expect(consulta.body.periodos[3].orden).toBe(4)

    const reactivado = await ajustar(id, tercero.id, cookie, { estado: 'activo' })
    expect(reactivado.status).toBe(200)
    expect(reactivado.body.periodo.estado).toBe('activo')
  })

  it('ajusta las fechas de un periodo sin tocar las de los demás', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()

    const respuesta = await ajustar(id, periodos[0].id, cookie, { fechaFin: '2026-09-14' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.periodo).toMatchObject({
      fechaInicio: '2026-09-10',
      fechaFin: '2026-09-14',
    })
    const consulta = await request(app).get(`/api/actividades/${id}/periodos`).set('Cookie', cookie)
    expect(consulta.body.periodos[1].fechaInicio).toBe('2026-09-17')
  })

  it('rechaza con 422 fechas que se traslapan con otro periodo activo', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()

    const respuesta = await ajustar(id, periodos[0].id, cookie, { fechaFin: '2026-09-20' })

    expect(respuesta.status).toBe(422)
    expect(respuesta.body.codigo).toBe('periodo_traslapado')
    expect(respuesta.body.mensaje).toContain('periodo 2')
  })

  it('un periodo cancelado no bloquea el rango, pero no se puede reactivar si otro lo ocupó', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()
    await ajustar(id, periodos[1].id, cookie, { estado: 'cancelado' })

    const extendido = await ajustar(id, periodos[0].id, cookie, { fechaFin: '2026-09-20' })
    expect(extendido.status).toBe(200)

    const reactivado = await ajustar(id, periodos[1].id, cookie, { estado: 'activo' })
    expect(reactivado.status).toBe(422)
    expect(reactivado.body.codigo).toBe('periodo_traslapado')
  })

  it('rechaza una fecha de fin anterior a la de inicio', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()

    const respuesta = await ajustar(id, periodos[0].id, cookie, { fechaFin: '2026-09-01' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.fechaFin).toBeDefined()
  })

  it('rechaza un cuerpo sin cambios, fechas mal formadas y estados fuera de catálogo', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()

    expect((await ajustar(id, periodos[0].id, cookie, {})).status).toBe(400)
    const fecha = await ajustar(id, periodos[0].id, cookie, { fechaInicio: '10/09/2026' })
    expect(fecha.status).toBe(400)
    expect(fecha.body.detallePorCampo.fechaInicio).toBeDefined()
    const estado = await ajustar(id, periodos[0].id, cookie, { estado: 'borrado' })
    expect(estado.status).toBe(400)
    expect(estado.body.detallePorCampo.estado).toBeDefined()
  })

  it('responde 404 si el periodo no existe o es de otra actividad', async () => {
    const { cookie, id } = await actividadConCalendario()
    const cookieOtra = await registrarYObtenerCookie('otra@ejemplo.com')
    const otra = await crearActividad(cookieOtra)
    const periodosAjenos = (await generar(otra.id, cookieOtra)).body.periodos as Periodo[]

    const inexistente = await ajustar(id, 'no-existe', cookie, { estado: 'cancelado' })
    const ajeno = await ajustar(id, periodosAjenos[0].id, cookie, { estado: 'cancelado' })

    expect(inexistente.status).toBe(404)
    expect(ajeno.status).toBe(404)
    expect(ajeno.body.codigo).toBe('periodo_no_encontrado')
  })

  it('responde 403 a un participante', async () => {
    const { id, claveIngreso, periodos } = await actividadConCalendario()
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await ajustar(id, periodos[0].id, cookieParticipante, { estado: 'cancelado' })

    expect(respuesta.status).toBe(403)
  })

  it('un co-organizador necesita el permiso configurar_actividad', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()
    const cookieCoorg = await registrarYObtenerCookie('coorg@ejemplo.com')
    const coorg = await prisma.usuario.findUniqueOrThrow({ where: { correo: 'coorg@ejemplo.com' } })
    await request(app)
      .put(`/api/actividades/${id}/coorganizadores/${coorg.idUsuario}`)
      .set('Cookie', cookie)
      .send({ permisos: ['gestionar_equipos'] })

    const sinPermiso = await ajustar(id, periodos[0].id, cookieCoorg, { estado: 'cancelado' })
    expect(sinPermiso.status).toBe(403)

    await request(app)
      .put(`/api/actividades/${id}/coorganizadores/${coorg.idUsuario}`)
      .set('Cookie', cookie)
      .send({ permisos: ['configurar_actividad'] })

    const conPermiso = await ajustar(id, periodos[0].id, cookieCoorg, { estado: 'cancelado' })
    expect(conPermiso.status).toBe(200)
  })

  it('sigue permitido en desarrollo (cancelar una entrega durante la actividad), no en cierre', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()

    await prisma.actividad.update({ where: { idActividad: id }, data: { estado: 'desarrollo' } })
    const enDesarrollo = await ajustar(id, periodos[2].id, cookie, { estado: 'cancelado' })
    expect(enDesarrollo.status).toBe(200)

    await prisma.actividad.update({ where: { idActividad: id }, data: { estado: 'cierre' } })
    const enCierre = await ajustar(id, periodos[3].id, cookie, { estado: 'cancelado' })
    expect(enCierre.status).toBe(409)
    expect(enCierre.body.codigo).toBe('fase_no_permite_accion')
  })

  it('registra un evento de historial con los valores anterior y nuevo', async () => {
    const { cookie, id, periodos } = await actividadConCalendario()

    await ajustar(id, periodos[2].id, cookie, { estado: 'cancelado' })

    const evento = await prisma.historial.findFirst({
      where: { idActividad: id, tipoEvento: 'periodo_modificado' },
    })
    expect(evento?.idEntidad).toBe(periodos[2].id)
    expect(evento?.datos).toMatchObject({
      orden: 3,
      antes: { estado: 'activo' },
      despues: { estado: 'cancelado' },
    })
  })
})
