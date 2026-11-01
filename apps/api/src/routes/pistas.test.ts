import request, { type Response } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

const app = createApp()

const REGISTRO = {
  apellidoPaterno: 'Lovelace',
  apellidoMaterno: 'Byron',
  nivelEstudios: 'Licenciatura',
  institucionEducativa: 'UNAM',
  contrasena: 'contrasena-larga',
}

function cookieDe(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((v) => v.startsWith('sesion='))
  if (!cookie) throw new Error('sin cookie de sesión')
  return cookie.split(';')[0]
}

async function registrar(nombre: string): Promise<string> {
  const r = await request(app)
    .post('/api/usuarios')
    .send({ ...REGISTRO, nombre, correo: `${nombre.toLowerCase()}@ejemplo.com` })
  return cookieDe(r)
}

let ada: string
let grace: string

beforeAll(async () => {
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
  ada = await registrar('Ada')
  grace = await registrar('Grace')
})

afterAll(async () => {
  await prisma.$disconnect()
})

const pistasDe = async (cookie: string) =>
  (await request(app).get('/api/usuarios/yo/pistas').set('Cookie', cookie)).body.pistas

describe('/api/usuarios/yo/pistas', () => {
  it('exige sesión', async () => {
    await request(app).get('/api/usuarios/yo/pistas').expect(401)
    await request(app).put('/api/usuarios/yo/pistas/equipos').expect(401)
  })

  it('una cuenta nueva no ha visto ninguna, ni la bienvenida', async () => {
    expect(await pistasDe(ada)).toEqual([])
  })

  it('marcar es idempotente y no afecta a otras personas', async () => {
    await request(app).put('/api/usuarios/yo/pistas/equipos').set('Cookie', ada).expect(204)
    await request(app).put('/api/usuarios/yo/pistas/equipos').set('Cookie', ada).expect(204)
    await request(app).put('/api/usuarios/yo/pistas/bienvenida').set('Cookie', ada).expect(204)

    expect((await pistasDe(ada)).sort()).toEqual(['bienvenida', 'equipos'])
    expect(await pistasDe(grace)).toEqual([])
  })

  it('rechaza una ayuda que no existe', async () => {
    const r = await request(app).put('/api/usuarios/yo/pistas/inventada').set('Cookie', grace)
    expect(r.status).toBe(400)
    expect(r.body.detallePorCampo).toEqual({ idPista: 'Esa ayuda no existe.' })
  })

  it('reiniciar las vuelve a mostrar todas', async () => {
    await request(app).put('/api/usuarios/yo/pistas/metas').set('Cookie', grace).expect(204)
    await request(app).delete('/api/usuarios/yo/pistas').set('Cookie', grace).expect(204)
    expect(await pistasDe(grace)).toEqual([])
  })
})
