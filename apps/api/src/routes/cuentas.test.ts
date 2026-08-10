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

function extraerCookie(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((valor) => valor.startsWith('sesion='))
  if (!cookie) throw new Error('la respuesta no trae cookie de sesión')
  return cookie.split(';')[0]
}

beforeEach(async () => {
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/usuarios', () => {
  it('registra una cuenta, inicia sesión y no expone la contraseña', async () => {
    const respuesta = await request(app).post('/api/usuarios').send(DATOS_REGISTRO)

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.usuario.correo).toBe(DATOS_REGISTRO.correo)
    expect(respuesta.body.usuario.contrasena).toBeUndefined()

    const cookie = extraerCookie(respuesta)
    const respuestaSesion = await request(app).get('/api/sesion').set('Cookie', cookie)
    expect(respuestaSesion.status).toBe(200)
    expect(respuestaSesion.body.usuario.correo).toBe(DATOS_REGISTRO.correo)
  })

  it('rechaza un correo duplicado sin distinguir mayúsculas, con 409', async () => {
    await request(app).post('/api/usuarios').send(DATOS_REGISTRO).expect(201)

    const respuesta = await request(app)
      .post('/api/usuarios')
      .send({ ...DATOS_REGISTRO, correo: DATOS_REGISTRO.correo.toUpperCase() })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.codigo).toBe('correo_duplicado')
  })

  it('rechaza datos incompletos con 400 y detalle por campo', async () => {
    const respuesta = await request(app).post('/api/usuarios').send({ correo: 'no-valido' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.codigo).toBe('validacion')
    expect(respuesta.body.detallePorCampo.nombre).toBeDefined()
    expect(respuesta.body.detallePorCampo.correo).toBeDefined()
  })
})

describe('POST /api/sesion', () => {
  beforeEach(async () => {
    await request(app).post('/api/usuarios').send(DATOS_REGISTRO)
  })

  it('inicia sesión con credenciales válidas y rota la cookie', async () => {
    const respuesta = await request(app)
      .post('/api/sesion')
      .send({ correo: DATOS_REGISTRO.correo, contrasena: DATOS_REGISTRO.contrasena })

    expect(respuesta.status).toBe(200)
    expect(extraerCookie(respuesta)).toMatch(/^sesion=.+/)
  })

  it('responde 401 con contraseña incorrecta', async () => {
    const respuesta = await request(app)
      .post('/api/sesion')
      .send({ correo: DATOS_REGISTRO.correo, contrasena: 'incorrecta-pero-larga' })

    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('credenciales_invalidas')
  })

  it('responde 401 con el mismo mensaje para un correo inexistente', async () => {
    const respuesta = await request(app)
      .post('/api/sesion')
      .send({ correo: 'nadie@ejemplo.com', contrasena: 'lo-que-sea-largo' })

    expect(respuesta.status).toBe(401)
    expect(respuesta.body.mensaje).toBe('Correo o contraseña incorrectos.')
  })

  it('responde 401 si la cuenta está desactivada', async () => {
    await prisma.usuario.update({
      where: { correo: DATOS_REGISTRO.correo },
      data: { estadoCuenta: 'desactivada' },
    })

    const respuesta = await request(app)
      .post('/api/sesion')
      .send({ correo: DATOS_REGISTRO.correo, contrasena: DATOS_REGISTRO.contrasena })

    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('cuenta_desactivada')
  })
})

describe('GET /api/sesion', () => {
  it('responde 401 sin cookie de sesión', async () => {
    const respuesta = await request(app).get('/api/sesion')

    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('sin_sesion')
  })
})

describe('DELETE /api/sesion', () => {
  it('cierra la sesión: elimina el registro en servidor y la cookie deja de servir', async () => {
    const registro = await request(app).post('/api/usuarios').send(DATOS_REGISTRO)
    const cookie = extraerCookie(registro)

    const cierre = await request(app).delete('/api/sesion').set('Cookie', cookie)
    expect(cierre.status).toBe(204)
    expect(await prisma.sesion.count()).toBe(0)

    const respuestaTrasCierre = await request(app).get('/api/sesion').set('Cookie', cookie)
    expect(respuestaTrasCierre.status).toBe(401)
  })

  it('responde 401 sin sesión activa', async () => {
    const respuesta = await request(app).delete('/api/sesion')
    expect(respuesta.status).toBe(401)
  })
})
