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

const NOMBRE_NUEVO = { nombre: 'Ada', apellidoPaterno: 'King', apellidoMaterno: 'Byron' }

function cookieDe(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((v) => v.startsWith('sesion='))
  if (!cookie) throw new Error('sin cookie de sesión')
  return cookie.split(';')[0]
}

interface Cuenta {
  idUsuario: string
  cookie: string
}

async function registrar(nombre: string): Promise<Cuenta> {
  const r = await request(app)
    .post('/api/usuarios')
    .send({ ...REGISTRO, nombre, correo: `${nombre.toLowerCase()}@ejemplo.com` })
  const cookie = cookieDe(r)
  const usuario = await prisma.usuario.findFirstOrThrow({ where: { nombre } })
  return { idUsuario: usuario.idUsuario, cookie }
}

function solicitar(cuenta: Cuenta, datos: object) {
  return request(app)
    .put('/api/usuarios/yo/solicitud-nombre')
    .set('Cookie', cuenta.cookie)
    .send(datos)
}

function descartar(cuenta: Cuenta, idSolicitud: string, estado: string) {
  return request(app)
    .delete(`/api/usuarios/yo/solicitud-nombre/${idSolicitud}?estado=${estado}`)
    .set('Cookie', cuenta.cookie)
}

async function perfilDe(cuenta: Cuenta) {
  const r = await request(app).get('/api/usuarios/yo').set('Cookie', cuenta.cookie)
  return r.body.usuario
}

// Cada prueba usa su propia cuenta para no pisarse; ver perfil.test.ts.
let admin: Cuenta
let ada: Cuenta
let grace: Cuenta
let linus: Cuenta
let margaret: Cuenta
let barbara: Cuenta
let edsger: Cuenta

beforeAll(async () => {
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
  admin = await registrar('Admin')
  await prisma.usuario.update({
    where: { idUsuario: admin.idUsuario },
    data: { tipoCuenta: 'administrador' },
  })
  ada = await registrar('Ada')
  grace = await registrar('Grace')
  linus = await registrar('Linus')
  margaret = await registrar('Margaret')
  barbara = await registrar('Barbara')
  edsger = await registrar('Edsger')
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('PUT /api/usuarios/yo/solicitud-nombre', () => {
  it('deja la solicitud pendiente sin cambiar el nombre, y el administrador la ve', async () => {
    const r = await solicitar(ada, NOMBRE_NUEVO)

    expect(r.status).toBe(201)
    expect(r.body.solicitud).toMatchObject({ ...NOMBRE_NUEVO, estado: 'pendiente' })

    const perfil = await perfilDe(ada)
    expect(perfil.apellidoPaterno).toBe('Lovelace')
    expect(perfil.solicitudNombre).toMatchObject({ apellidoPaterno: 'King', estado: 'pendiente' })

    const lista = await request(app)
      .get('/api/admin/solicitudes-nombre')
      .set('Cookie', admin.cookie)
    expect(lista.status).toBe(200)
    expect(lista.body.solicitudes).toContainEqual(
      expect.objectContaining({
        idSolicitud: r.body.solicitud.idSolicitud,
        solicitado: NOMBRE_NUEVO,
        usuario: expect.objectContaining({
          idUsuario: ada.idUsuario,
          apellidoPaterno: 'Lovelace',
          correo: 'ada@ejemplo.com',
        }),
      }),
    )
  })

  it('rechaza un nombre vacío o igual al actual', async () => {
    const vacio = await solicitar(grace, { ...NOMBRE_NUEVO, nombre: ' ' })
    expect(vacio.status).toBe(400)
    expect(vacio.body.detallePorCampo.nombre).toBeDefined()

    const igual = await solicitar(grace, {
      nombre: 'Grace',
      apellidoPaterno: 'Lovelace',
      apellidoMaterno: 'Byron',
    })
    expect(igual.status).toBe(400)
  })

  it('dos envíos simultáneos dejan una sola solicitud, sin error', async () => {
    const respuestas = await Promise.all([
      solicitar(barbara, { ...NOMBRE_NUEVO, nombre: 'Barbara', apellidoPaterno: 'Liskov' }),
      solicitar(barbara, { ...NOMBRE_NUEVO, nombre: 'Barbara', apellidoPaterno: 'Huberman' }),
    ])

    expect(respuestas.map((r) => r.status)).toEqual([201, 201])
    expect(
      await prisma.solicitudCambioNombre.count({ where: { idUsuario: barbara.idUsuario } }),
    ).toBe(1)
  })

  it('un administrador no la necesita', async () => {
    const r = await solicitar(admin, NOMBRE_NUEVO)
    expect(r.status).toBe(403)
  })
})

describe('GET /api/usuarios/yo/solicitud-nombre (sondeo)', () => {
  it('devuelve solo la solicitud vigente, o null', async () => {
    const r = await request(app).get('/api/usuarios/yo/solicitud-nombre').set('Cookie', ada.cookie)
    expect(r.status).toBe(200)
    expect(r.body.solicitud).toMatchObject({ estado: 'pendiente', apellidoPaterno: 'King' })

    const sin = await request(app)
      .get('/api/usuarios/yo/solicitud-nombre')
      .set('Cookie', admin.cookie)
    expect(sin.body.solicitud).toBeNull()
  })

  it('con X-Sondeo comprueba la sesión sin renovar su actividad', async () => {
    const idSesion = decodeURIComponent(ada.cookie.split('=')[1])
    // Hace un minuto: dentro del plazo de inactividad, para que la sesión siga viva.
    const antes = new Date(Date.now() - 60_000)
    await prisma.sesion.update({ where: { id: idSesion }, data: { ultimaActividad: antes } })
    const { ultimaActividad: marcada } = await prisma.sesion.findUniqueOrThrow({
      where: { id: idSesion },
    })

    await request(app)
      .get('/api/usuarios/yo/solicitud-nombre')
      .set('Cookie', ada.cookie)
      .set('X-Sondeo', '1')
      .expect(200)
    const tras = await prisma.sesion.findUniqueOrThrow({ where: { id: idSesion } })
    expect(tras.ultimaActividad).toEqual(marcada)

    // Sin la cabecera, sí cuenta como actividad.
    await request(app).get('/api/usuarios/yo/solicitud-nombre').set('Cookie', ada.cookie)
    const renovada = await prisma.sesion.findUniqueOrThrow({ where: { id: idSesion } })
    expect(renovada.ultimaActividad.getTime()).toBeGreaterThan(antes.getTime())
  })
})

describe('resolución por el administrador', () => {
  it('aprobar aplica el nombre y la persona ve el aviso hasta descartarlo', async () => {
    const { body } = await solicitar(grace, {
      nombre: 'Grace',
      apellidoPaterno: 'Hopper',
      apellidoMaterno: 'Murray',
    })

    await request(app)
      .post(`/api/admin/solicitudes-nombre/${body.solicitud.idSolicitud}/aprobar`)
      .set('Cookie', admin.cookie)
      .expect(204)

    const perfil = await perfilDe(grace)
    expect(perfil.apellidoPaterno).toBe('Hopper')
    expect(perfil.solicitudNombre).toMatchObject({ estado: 'aprobada' })

    // Ya resuelta: una segunda aprobación no encuentra nada que aplicar, y ya
    // no está en la lista del administrador.
    await request(app)
      .post(`/api/admin/solicitudes-nombre/${body.solicitud.idSolicitud}/aprobar`)
      .set('Cookie', admin.cookie)
      .expect(404)

    await descartar(grace, body.solicitud.idSolicitud, 'aprobada').expect(204)
    expect((await perfilDe(grace)).solicitudNombre).toBeNull()
  })

  it('rechazar conserva el nombre y la persona ve el motivo hasta descartarlo', async () => {
    const { body } = await solicitar(linus, NOMBRE_NUEVO)

    await request(app)
      .post(`/api/admin/solicitudes-nombre/${body.solicitud.idSolicitud}/rechazar`)
      .set('Cookie', admin.cookie)
      .send({ motivo: '  Usa tu nombre como aparece en tu identificación.  ' })
      .expect(204)

    const perfil = await perfilDe(linus)
    expect(perfil.nombre).toBe('Linus')
    expect(perfil.solicitudNombre).toMatchObject({
      estado: 'rechazada',
      motivoRechazo: 'Usa tu nombre como aparece en tu identificación.',
    })

    // Una rechazada ya no está en la lista del administrador.
    const lista = await request(app)
      .get('/api/admin/solicitudes-nombre')
      .set('Cookie', admin.cookie)
    expect(lista.body.solicitudes.map((s: { idSolicitud: string }) => s.idSolicitud)).not.toContain(
      body.solicitud.idSolicitud,
    )

    await descartar(linus, body.solicitud.idSolicitud, 'rechazada').expect(204)
    expect((await perfilDe(linus)).solicitudNombre).toBeNull()
  })

  it('una solicitud reemplazada o cancelada ya no se puede aprobar', async () => {
    const primera = await solicitar(margaret, NOMBRE_NUEVO)
    const segunda = await solicitar(margaret, { ...NOMBRE_NUEVO, apellidoPaterno: 'Hamilton' })
    expect(segunda.body.solicitud.idSolicitud).not.toBe(primera.body.solicitud.idSolicitud)

    await request(app)
      .post(`/api/admin/solicitudes-nombre/${primera.body.solicitud.idSolicitud}/aprobar`)
      .set('Cookie', admin.cookie)
      .expect(404)

    await descartar(margaret, segunda.body.solicitud.idSolicitud, 'pendiente').expect(204)
    await request(app)
      .post(`/api/admin/solicitudes-nombre/${segunda.body.solicitud.idSolicitud}/aprobar`)
      .set('Cookie', admin.cookie)
      .expect(404)

    expect((await perfilDe(margaret)).apellidoPaterno).toBe('Lovelace')
    await descartar(margaret, segunda.body.solicitud.idSolicitud, 'pendiente').expect(404)
  })

  it('descartar solo borra la solicitud que la persona tiene a la vista', async () => {
    const vieja = await solicitar(edsger, NOMBRE_NUEVO)
    const nueva = await solicitar(edsger, { ...NOMBRE_NUEVO, apellidoPaterno: 'Dijkstra' })

    // Cancelar la vieja (otra pestaña) no borra la nueva.
    await descartar(edsger, vieja.body.solicitud.idSolicitud, 'pendiente').expect(404)
    expect((await perfilDe(edsger)).solicitudNombre).toMatchObject({
      idSolicitud: nueva.body.solicitud.idSolicitud,
    })

    // Si la rechazaron mientras tanto, cancelarla como pendiente no borra el aviso.
    await request(app)
      .post(`/api/admin/solicitudes-nombre/${nueva.body.solicitud.idSolicitud}/rechazar`)
      .set('Cookie', admin.cookie)
      .send({})
      .expect(204)
    await descartar(edsger, nueva.body.solicitud.idSolicitud, 'pendiente').expect(404)
    expect((await perfilDe(edsger)).solicitudNombre).toMatchObject({ estado: 'rechazada' })

    await descartar(edsger, nueva.body.solicitud.idSolicitud, 'otro').expect(400)
  })

  it('rechaza un motivo demasiado largo', async () => {
    const r = await request(app)
      .post('/api/admin/solicitudes-nombre/cualquiera/rechazar')
      .set('Cookie', admin.cookie)
      .send({ motivo: 'x'.repeat(501) })
    expect(r.status).toBe(400)
  })

  it('solo un administrador lista y resuelve', async () => {
    await request(app).get('/api/admin/solicitudes-nombre').set('Cookie', ada.cookie).expect(403)
    await request(app)
      .post('/api/admin/solicitudes-nombre/cualquiera/aprobar')
      .set('Cookie', ada.cookie)
      .expect(403)
  })
})
