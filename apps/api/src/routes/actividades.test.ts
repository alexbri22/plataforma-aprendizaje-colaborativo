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

async function registrarYObtenerCookie(correo = DATOS_REGISTRO.correo): Promise<string> {
  const respuesta = await request(app)
    .post('/api/usuarios')
    .send({ ...DATOS_REGISTRO, correo })
  return extraerCookie(respuesta)
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

describe('POST /api/actividades', () => {
  it('crea la actividad, la membresía de organizador y devuelve la clave de ingreso', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send(DATOS_ACTIVIDAD)

    expect(respuesta.status).toBe(201)
    const { actividad } = respuesta.body
    expect(actividad.nombre).toBe(DATOS_ACTIVIDAD.nombre)
    expect(actividad.fase).toBe('inscripcion')
    expect(actividad.rol).toBe('organizador')
    expect(actividad.numParticipantes).toBe(0)
    expect(actividad.claveIngreso).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/)
    expect(actividad.fechaClave).toBe(`Clave: ${actividad.claveIngreso}`)
    // Fechas de calendario, no el datetime completo de Date#toISOString():
    // apps/web/.../formato.ts las parsea como año-mes-día y truena con hora
    // incluida (docs/diseno-desarrollo-general.md §3.1 no exige una u otra
    // forma, pero el cliente de este incremento sí).
    expect(actividad.fechaInicio).toBe(DATOS_ACTIVIDAD.fechaInicio)
    expect(actividad.fechaTermino).toBe(DATOS_ACTIVIDAD.fechaTermino)
    expect(actividad.fechaLimiteInscripcion).toBe(DATOS_ACTIVIDAD.fechaLimiteInscripcion)

    const membresias = await prisma.membresia.findMany({ where: { idActividad: actividad.id } })
    expect(membresias).toHaveLength(1)
    expect(membresias[0]).toMatchObject({ rol: 'organizador', estado: 'activa' })
  })

  it('acepta el campo opcional tipoActividadPercibida sin persistirlo', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send({ ...DATOS_ACTIVIDAD, tipoActividadPercibida: 'Autodirigida' })

    expect(respuesta.status).toBe(201)
  })

  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).post('/api/actividades').send(DATOS_ACTIVIDAD)
    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('sin_sesion')
  })

  it('rechaza campos faltantes con 400 y detalle por campo', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send({ nombre: 'Solo nombre' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.codigo).toBe('validacion')
    expect(respuesta.body.detallePorCampo.objetivo).toBeDefined()
    expect(respuesta.body.detallePorCampo.informacionGeneral).toBeDefined()
    expect(respuesta.body.detallePorCampo.fechaInicio).toBeDefined()
    expect(respuesta.body.detallePorCampo.fechaTermino).toBeDefined()
    expect(respuesta.body.detallePorCampo.fechaLimiteInscripcion).toBeDefined()
    expect(respuesta.body.detallePorCampo.plazoCierreDias).toBeDefined()
    expect(respuesta.body.detallePorCampo.numeroEquiposEsperado).toBeDefined()
  })

  it('rechaza una fecha de término anterior o igual a la de inicio', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send({ ...DATOS_ACTIVIDAD, fechaTermino: DATOS_ACTIVIDAD.fechaInicio })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.fechaTermino).toBeDefined()
  })
})

describe('GET /api/actividades', () => {
  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).get('/api/actividades')
    expect(respuesta.status).toBe(401)
  })

  it('devuelve solo las actividades donde el actor es miembro, con su rol', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieAjena = await registrarYObtenerCookie('grace@ejemplo.com')

    await request(app)
      .post('/api/actividades')
      .set('Cookie', cookieOrganizadora)
      .send(DATOS_ACTIVIDAD)

    const respuestaOrganizadora = await request(app)
      .get('/api/actividades')
      .set('Cookie', cookieOrganizadora)
    expect(respuestaOrganizadora.status).toBe(200)
    expect(respuestaOrganizadora.body.actividades).toHaveLength(1)
    expect(respuestaOrganizadora.body.actividades[0].rol).toBe('organizador')

    const respuestaAjena = await request(app).get('/api/actividades').set('Cookie', cookieAjena)
    expect(respuestaAjena.status).toBe(200)
    expect(respuestaAjena.body.actividades).toHaveLength(0)
  })
})
