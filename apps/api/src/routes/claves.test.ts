import request, { type Response } from 'supertest'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

// nucleo §7.5: la tarea programada avanza la fase, pero un retraso suyo no
// debe dejar entrar a nadie después de la fecha límite. Aquí la tarea nunca
// corre. El límite ya vencido se declara en la actividad, en vez de falsear el
// reloj: el primer participante se inserta directo, porque por la API ya no
// podría unirse después del límite con otro dentro.
describe('clave con la fecha límite de inscripción vencida y la tarea sin correr', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const UN_DIA_MS = 24 * 60 * 60 * 1000
  const enDias = (dias: number) =>
    new Date(Date.now() + dias * UN_DIA_MS).toISOString().slice(0, 10)
  const LIMITE_VENCIDO = {
    ...DATOS_ACTIVIDAD,
    fechaInicio: enDias(-20),
    fechaLimiteInscripcion: enDias(-10),
    fechaTermino: enDias(30),
  }

  async function crearActividadConLimiteVencido(cookieOrganizadora: string) {
    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookieOrganizadora)
      .send(LIMITE_VENCIDO)
    return {
      id: respuesta.body.actividad.id as string,
      clave: respuesta.body.actividad.claveIngreso as string,
    }
  }

  async function agregarParticipanteDirecto(idActividad: string, correo: string) {
    const usuario = await prisma.usuario.findFirstOrThrow({ where: { correo } })
    await prisma.membresia.create({
      data: { idActividad, idUsuario: usuario.idUsuario, rol: 'participante', estado: 'activa' },
    })
  }

  it('ya no admite ni muestra la actividad si tiene al menos un participante', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie(DATOS_ORGANIZADORA)
    const { id, clave } = await crearActividadConLimiteVencido(cookieOrganizadora)
    await registrarYObtenerCookie(DATOS_PARTICIPANTE)
    await agregarParticipanteDirecto(id, DATOS_PARTICIPANTE.correo)
    const cookieTardia = await registrarYObtenerCookie({
      ...DATOS_PARTICIPANTE,
      nombre: 'Katherine',
      correo: 'katherine@ejemplo.com',
    })

    const vista = await request(app).get(`/api/claves/${clave}`).set('Cookie', cookieTardia)
    const union = await request(app).post(`/api/claves/${clave}/union`).set('Cookie', cookieTardia)

    expect(vista.status).toBe(404)
    expect(vista.body.codigo).toBe('clave_invalida')
    expect(union.status).toBe(404)
    expect(union.body.codigo).toBe('clave_invalida')
    expect(await prisma.membresia.count({ where: { rol: 'participante' } })).toBe(1)
  })

  it('sin participantes la actividad permanece en inscripción y la clave sigue funcionando (nucleo §7.4, caso límite)', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie(DATOS_ORGANIZADORA)
    const { clave } = await crearActividadConLimiteVencido(cookieOrganizadora)
    const cookieTardia = await registrarYObtenerCookie(DATOS_PARTICIPANTE)

    const union = await request(app).post(`/api/claves/${clave}/union`).set('Cookie', cookieTardia)

    expect(union.status).toBe(201)
  })

  // Único caso que necesita un instante preciso: el límite termina al final
  // del día en Ciudad de México (UTC-6), no a medianoche UTC. Reloj congelado,
  // acotado a esta prueba (no escribe eventos cuyo orden importe).
  it('admite hasta que termina el día del límite en Ciudad de México y no después', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-12T18:00:00.000Z'))
    const cookieOrganizadora = await registrarYObtenerCookie(DATOS_ORGANIZADORA)
    const clave = await crearActividadYObtenerClave(cookieOrganizadora) // límite: 2026-09-15
    await registrarYObtenerCookie(DATOS_PARTICIPANTE)
    const actividad = await prisma.actividad.findFirstOrThrow({ where: { claveIngreso: clave } })
    await agregarParticipanteDirecto(actividad.idActividad, DATOS_PARTICIPANTE.correo)
    const cookieA = await registrarYObtenerCookie({
      ...DATOS_PARTICIPANTE,
      nombre: 'Katherine',
      correo: 'katherine@ejemplo.com',
    })
    const cookieB = await registrarYObtenerCookie({
      ...DATOS_PARTICIPANTE,
      nombre: 'Dorothy',
      correo: 'dorothy@ejemplo.com',
    })

    // 2026-09-15 23:00 en CDMX es 2026-09-16 05:00 UTC: todavía es el día.
    vi.setSystemTime(new Date('2026-09-16T05:00:00.000Z'))
    const antes = await request(app).post(`/api/claves/${clave}/union`).set('Cookie', cookieA)
    expect(antes.status).toBe(201)

    // 2026-09-16 00:30 en CDMX: ya pasó.
    vi.setSystemTime(new Date('2026-09-16T06:30:00.000Z'))
    const despues = await request(app).post(`/api/claves/${clave}/union`).set('Cookie', cookieB)
    expect(despues.status).toBe(404)
  })
})
