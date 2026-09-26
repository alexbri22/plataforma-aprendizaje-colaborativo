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

// PNG de 1x1 válido: la firma importa, no la imagen.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

function cookieDe(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((v) => v.startsWith('sesion='))
  if (!cookie) throw new Error('sin cookie de sesión')
  return cookie.split(';')[0]
}

interface Cuenta {
  nombre: string
  correo: string
  idUsuario: string
  cookie: string
}

async function registrar(nombre: string): Promise<Cuenta> {
  const correo = `${nombre.toLowerCase()}@ejemplo.com`
  const r = await request(app)
    .post('/api/usuarios')
    .send({ ...REGISTRO, nombre, correo })
  const cookie = cookieDe(r)
  const usuario = await prisma.usuario.findFirstOrThrow({ where: { nombre } })
  return { nombre, correo, idUsuario: usuario.idUsuario, cookie }
}

// Cuentas registradas una sola vez por el límite de intentos del registro;
// cada prueba usa la suya para no pisarse. Ver insignias.test.ts.
let ada: Cuenta
let grace: Cuenta
let linus: Cuenta
let margaret: Cuenta

beforeAll(async () => {
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
  ada = await registrar('Ada')
  grace = await registrar('Grace')
  linus = await registrar('Linus')
  margaret = await registrar('Margaret')
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /api/usuarios/yo', () => {
  it('devuelve el perfil propio completo, con rangos y sin contraseña', async () => {
    const r = await request(app).get('/api/usuarios/yo').set('Cookie', ada.cookie)

    expect(r.status).toBe(200)
    expect(r.body.usuario).toMatchObject({
      idUsuario: ada.idUsuario,
      nombre: 'Ada',
      correo: ada.correo,
      nivelEstudios: 'licenciatura',
      institucionEducativa: 'UNAM',
      fotoUrl: null,
      acumulado: {},
    })
    expect(r.body.usuario.contrasena).toBeUndefined()
  })

  it('exige sesión', async () => {
    await request(app).get('/api/usuarios/yo').expect(401)
  })
})

describe('PATCH /api/usuarios/yo', () => {
  it('edita nombre y apellidos y la sesión lo refleja', async () => {
    const r = await request(app)
      .patch('/api/usuarios/yo')
      .set('Cookie', grace.cookie)
      .send({ nombre: 'Grace', apellidoPaterno: 'Hopper', apellidoMaterno: 'Murray' })

    expect(r.status).toBe(200)
    expect(r.body.usuario.apellidoPaterno).toBe('Hopper')

    const sesion = await request(app).get('/api/sesion').set('Cookie', grace.cookie)
    expect(sesion.body.usuario.apellidoPaterno).toBe('Hopper')
  })

  it('rechaza apellidos vacíos con detalle por campo', async () => {
    const r = await request(app)
      .patch('/api/usuarios/yo')
      .set('Cookie', grace.cookie)
      .send({ nombre: 'Grace', apellidoPaterno: '  ', apellidoMaterno: 'Murray' })

    expect(r.status).toBe(400)
    expect(r.body.detallePorCampo.apellidoPaterno).toBeDefined()
  })

  it('cambia la contraseña exigiendo la actual y cierra las demás sesiones', async () => {
    const otraSesion = cookieDe(
      await request(app)
        .post('/api/sesion')
        .send({ correo: linus.correo, contrasena: REGISTRO.contrasena })
        .expect(200),
    )

    const incorrecta = await request(app)
      .patch('/api/usuarios/yo')
      .set('Cookie', linus.cookie)
      .send({ contrasenaActual: 'no-es-esta', contrasenaNueva: 'otra-contrasena-larga' })
    expect(incorrecta.status).toBe(400)
    expect(incorrecta.body.detallePorCampo.contrasenaActual).toBeDefined()

    await request(app)
      .patch('/api/usuarios/yo')
      .set('Cookie', linus.cookie)
      .send({ contrasenaActual: REGISTRO.contrasena, contrasenaNueva: 'otra-contrasena-larga' })
      .expect(204)

    // La sesión desde la que se cambió sigue viva; la otra no.
    await request(app).get('/api/sesion').set('Cookie', linus.cookie).expect(200)
    await request(app).get('/api/sesion').set('Cookie', otraSesion).expect(401)

    await request(app)
      .post('/api/sesion')
      .send({ correo: linus.correo, contrasena: 'otra-contrasena-larga' })
      .expect(200)
  })
})

describe('foto de perfil', () => {
  it('se sube, se sirve con su tipo, versiona la URL y se quita', async () => {
    const subida = await request(app)
      .put('/api/usuarios/yo/foto')
      .set('Cookie', margaret.cookie)
      .set('Content-Type', 'image/png')
      .send(PNG)

    expect(subida.status).toBe(200)
    const { fotoUrl } = subida.body.usuario as { fotoUrl: string }
    expect(fotoUrl).toMatch(new RegExp(`^/api/usuarios/${margaret.idUsuario}/foto\\?v=\\d+$`))

    // La sesión y el perfil de otro la exponen igual.
    const sesion = await request(app).get('/api/sesion').set('Cookie', margaret.cookie)
    expect(sesion.body.usuario.fotoUrl).toBe(fotoUrl)

    const imagen = await request(app).get(fotoUrl).set('Cookie', ada.cookie).buffer(true)
    expect(imagen.status).toBe(200)
    expect(imagen.headers['content-type']).toBe('image/png')
    expect(imagen.headers['cache-control']).toContain('immutable')
    expect(Buffer.from(imagen.body as Buffer).equals(PNG)).toBe(true)

    const quitada = await request(app)
      .delete('/api/usuarios/yo/foto')
      .set('Cookie', margaret.cookie)
    expect(quitada.body.usuario.fotoUrl).toBeNull()
    await request(app).get(fotoUrl).set('Cookie', ada.cookie).expect(404)
  })

  it('rechaza tipos no admitidos, firmas que no corresponden y archivos grandes', async () => {
    const texto = await request(app)
      .put('/api/usuarios/yo/foto')
      .set('Cookie', margaret.cookie)
      .set('Content-Type', 'text/plain')
      .send('hola')
    expect(texto.status).toBe(400)
    expect(texto.body.codigo).toBe('foto_invalida')

    const disfrazado = await request(app)
      .put('/api/usuarios/yo/foto')
      .set('Cookie', margaret.cookie)
      .set('Content-Type', 'image/jpeg')
      .send(PNG)
    expect(disfrazado.status).toBe(400)

    const grande = await request(app)
      .put('/api/usuarios/yo/foto')
      .set('Cookie', margaret.cookie)
      .set('Content-Type', 'image/png')
      .send(Buffer.concat([PNG, Buffer.alloc(600 * 1024)]))
    expect(grande.status).toBe(413)
  })

  it('exige sesión para verla', async () => {
    await request(app).get(`/api/usuarios/${ada.idUsuario}/foto`).expect(401)
  })
})

describe('GET /api/usuarios/:id', () => {
  it('muestra nombre, foto y rangos de otro usuario, nunca el correo', async () => {
    const r = await request(app).get(`/api/usuarios/${ada.idUsuario}`).set('Cookie', grace.cookie)

    expect(r.status).toBe(200)
    expect(r.body.usuario).toEqual({
      idUsuario: ada.idUsuario,
      nombre: 'Ada',
      apellidoPaterno: 'Lovelace',
      apellidoMaterno: 'Byron',
      fotoUrl: null,
      acumulado: {},
    })
    expect(r.body.usuario.correo).toBeUndefined()
  })

  it('responde 404 si no existe', async () => {
    const r = await request(app)
      .get('/api/usuarios/00000000-0000-0000-0000-000000000000')
      .set('Cookie', grace.cookie)
    expect(r.status).toBe(404)
  })
})
