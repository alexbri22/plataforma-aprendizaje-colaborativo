import request, { type Response } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

const app = createApp()

const DATOS_ORGANIZADORA = {
  nombre: 'Ada',
  apellidoPaterno: 'Lovelace',
  apellidoMaterno: 'Byron',
  nivelEstudios: 'Licenciatura',
  institucionEducativa: 'UNAM',
  correo: 'ada@ejemplo.com',
  contrasena: 'contrasena-larga',
}

const DATOS_PARTICIPANTE = {
  ...DATOS_ORGANIZADORA,
  nombre: 'Grace',
  correo: 'grace@ejemplo.com',
}

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

async function registrarYObtenerCookie(datos: typeof DATOS_ORGANIZADORA): Promise<string> {
  const respuesta = await request(app).post('/api/usuarios').send(datos)
  return extraerCookie(respuesta)
}

async function crearActividadYObtenerClave(cookieOrganizadora: string): Promise<string> {
  const respuesta = await request(app)
    .post('/api/actividades')
    .set('Cookie', cookieOrganizadora)
    .send(DATOS_ACTIVIDAD)
  return respuesta.body.actividad.claveIngreso as string
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

describe('GET /api/claves/:clave', () => {
  it('devuelve nombre, objetivo y organizador sin exigir membresía', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie(DATOS_ORGANIZADORA)
    const clave = await crearActividadYObtenerClave(cookieOrganizadora)
    const cookieAjena = await registrarYObtenerCookie(DATOS_PARTICIPANTE)

    const respuesta = await request(app).get(`/api/claves/${clave}`).set('Cookie', cookieAjena)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toEqual({
      nombre: DATOS_ACTIVIDAD.nombre,
      objetivo: DATOS_ACTIVIDAD.objetivo,
      nombreOrganizador: 'Ada Lovelace Byron',
    })
  })

  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).get('/api/claves/CUALQUIERA')
    expect(respuesta.status).toBe(401)
  })

  it('responde 404 con una clave que no corresponde a ninguna actividad', async () => {
    const cookie = await registrarYObtenerCookie(DATOS_ORGANIZADORA)

    const respuesta = await request(app).get('/api/claves/NOEXISTE1').set('Cookie', cookie)

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('clave_invalida')
  })

  it('responde 404 con la misma clave si la actividad ya no está en inscripción', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie(DATOS_ORGANIZADORA)
    const clave = await crearActividadYObtenerClave(cookieOrganizadora)
    await prisma.actividad.updateMany({ data: { estado: 'desarrollo' } })

    const respuesta = await request(app)
      .get(`/api/claves/${clave}`)
      .set('Cookie', cookieOrganizadora)

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('clave_invalida')
  })
})

describe('POST /api/claves/:clave/union', () => {
  it('crea la membresía de participante y la actividad aparece en el listado del actor', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie(DATOS_ORGANIZADORA)
    const clave = await crearActividadYObtenerClave(cookieOrganizadora)
    const cookieParticipante = await registrarYObtenerCookie(DATOS_PARTICIPANTE)

    const respuesta = await request(app)
      .post(`/api/claves/${clave}/union`)
      .set('Cookie', cookieParticipante)

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.actividad.rol).toBe('participante')
    expect(respuesta.body.actividad.numParticipantes).toBe(1)

    const listado = await request(app).get('/api/actividades').set('Cookie', cookieParticipante)
    expect(listado.body.actividades).toHaveLength(1)
    expect(listado.body.actividades[0].rol).toBe('participante')
  })

  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).post('/api/claves/CUALQUIERA/union')
    expect(respuesta.status).toBe(401)
  })

  it('responde 404 con una clave que no corresponde a ninguna actividad', async () => {
    const cookie = await registrarYObtenerCookie(DATOS_ORGANIZADORA)

    const respuesta = await request(app).post('/api/claves/NOEXISTE1/union').set('Cookie', cookie)

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('clave_invalida')
  })

  it('responde 409 si el actor ya es miembro de la actividad', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie(DATOS_ORGANIZADORA)
    const clave = await crearActividadYObtenerClave(cookieOrganizadora)

    const respuesta = await request(app)
      .post(`/api/claves/${clave}/union`)
      .set('Cookie', cookieOrganizadora)

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.codigo).toBe('ya_es_miembro')
  })
})
