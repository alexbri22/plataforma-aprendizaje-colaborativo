import request, { type Response } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

const app = createApp()

const DATOS_ADMIN = {
  nombre: 'Grace',
  apellidoPaterno: 'Hopper',
  apellidoMaterno: 'Murray',
  nivelEstudios: 'Posgrado',
  institucionEducativa: 'Yale',
  correo: 'grace@ejemplo.com',
  contrasena: 'contrasena-admin-larga',
}

const DATOS_USUARIO = {
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

// Registra una cuenta y devuelve su id y su cookie de sesión.
async function registrar(datos: typeof DATOS_USUARIO): Promise<{ id: string; cookie: string }> {
  const respuesta = await request(app).post('/api/usuarios').send(datos).expect(201)
  return { id: respuesta.body.usuario.idUsuario, cookie: extraerCookie(respuesta) }
}

// La sesión resuelve el tipo de cuenta en vivo en cada petición
// (obtenerActorPorSesion lee el usuario), así que promover la cuenta basta:
// la misma cookie pasa a resolver a un actor administrador sin re-login.
async function registrarAdministrador(): Promise<{ id: string; cookie: string }> {
  const admin = await registrar(DATOS_ADMIN)
  await prisma.usuario.update({
    where: { idUsuario: admin.id },
    data: { tipoCuenta: 'administrador' },
  })
  return admin
}

beforeEach(async () => {
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /api/admin/usuarios', () => {
  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).get('/api/admin/usuarios')
    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('sin_sesion')
  })

  it('responde 403 a una cuenta de usuario', async () => {
    const usuario = await registrar(DATOS_USUARIO)
    const respuesta = await request(app).get('/api/admin/usuarios').set('Cookie', usuario.cookie)
    expect(respuesta.status).toBe(403)
    expect(respuesta.body.codigo).toBe('no_autorizado')
  })

  it('devuelve las cuentas con su estado y sin la contraseña a un administrador', async () => {
    await registrar(DATOS_USUARIO)
    const admin = await registrarAdministrador()

    const respuesta = await request(app).get('/api/admin/usuarios').set('Cookie', admin.cookie)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.usuarios).toHaveLength(2)

    const cuentaAda = respuesta.body.usuarios.find(
      (u: { correo: string }) => u.correo === DATOS_USUARIO.correo,
    )
    expect(cuentaAda).toMatchObject({
      correo: DATOS_USUARIO.correo,
      tipoCuenta: 'usuario',
      estadoCuenta: 'activa',
    })
    expect(cuentaAda.contrasena).toBeUndefined()
  })
})

describe('POST /api/admin/usuarios/:id/contrasena', () => {
  it('responde 403 a una cuenta de usuario', async () => {
    const usuario = await registrar(DATOS_USUARIO)
    const respuesta = await request(app)
      .post(`/api/admin/usuarios/${usuario.id}/contrasena`)
      .set('Cookie', usuario.cookie)
      .send({ contrasena: 'nueva-contrasena-larga' })
    expect(respuesta.status).toBe(403)
    expect(respuesta.body.codigo).toBe('no_autorizado')
  })

  it('restablece la contraseña, cierra las sesiones del usuario y acepta la nueva credencial', async () => {
    const usuario = await registrar(DATOS_USUARIO)
    const admin = await registrarAdministrador()

    // El usuario tiene una sesión activa antes del restablecimiento.
    expect(
      (await request(app).get('/api/sesion').set('Cookie', usuario.cookie)).status,
    ).toBe(200)

    const respuesta = await request(app)
      .post(`/api/admin/usuarios/${usuario.id}/contrasena`)
      .set('Cookie', admin.cookie)
      .send({ contrasena: 'contrasena-nueva-larga' })
    expect(respuesta.status).toBe(204)

    // La sesión previa del usuario queda invalidada.
    expect(await prisma.sesion.count({ where: { idUsuario: usuario.id } })).toBe(0)
    expect(
      (await request(app).get('/api/sesion').set('Cookie', usuario.cookie)).status,
    ).toBe(401)

    // La contraseña anterior ya no sirve; la nueva sí.
    expect(
      (
        await request(app)
          .post('/api/sesion')
          .send({ correo: DATOS_USUARIO.correo, contrasena: DATOS_USUARIO.contrasena })
      ).status,
    ).toBe(401)
    expect(
      (
        await request(app)
          .post('/api/sesion')
          .send({ correo: DATOS_USUARIO.correo, contrasena: 'contrasena-nueva-larga' })
      ).status,
    ).toBe(200)
  })

  it('responde 404 para un usuario inexistente', async () => {
    const admin = await registrarAdministrador()
    const respuesta = await request(app)
      .post('/api/admin/usuarios/00000000-0000-0000-0000-000000000000/contrasena')
      .set('Cookie', admin.cookie)
      .send({ contrasena: 'contrasena-nueva-larga' })
    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('usuario_no_encontrado')
  })

  it('responde 400 con detalle por campo si la contraseña es demasiado corta', async () => {
    const usuario = await registrar(DATOS_USUARIO)
    const admin = await registrarAdministrador()

    const respuesta = await request(app)
      .post(`/api/admin/usuarios/${usuario.id}/contrasena`)
      .set('Cookie', admin.cookie)
      .send({ contrasena: 'corta' })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.codigo).toBe('validacion')
    expect(respuesta.body.detallePorCampo.contrasena).toBeDefined()
  })
})
