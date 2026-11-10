import request, { type Response } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

const app = createApp()

const CORREOS = {
  admin: 'admin.recomendaciones@ejemplo.com',
  ana: 'ana.recomendaciones@ejemplo.com',
  beto: 'beto.recomendaciones@ejemplo.com',
}

function datosDe(nombre: string, correo: string) {
  return {
    nombre,
    apellidoPaterno: 'Prueba',
    apellidoMaterno: 'Recomendaciones',
    nivelEstudios: 'Licenciatura',
    institucionEducativa: 'UNAM',
    correo,
    contrasena: 'contrasena-larga',
  }
}

function extraerCookie(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((valor) => valor.startsWith('sesion='))
  if (!cookie) throw new Error('la respuesta no trae cookie de sesión')
  return cookie.split(';')[0]
}

async function registrar(nombre: string, correo: string) {
  const respuesta = await request(app)
    .post('/api/usuarios')
    .send(datosDe(nombre, correo))
    .expect(201)
  return { id: respuesta.body.usuario.idUsuario as string, cookie: extraerCookie(respuesta) }
}

let admin: { id: string; cookie: string }
let ana: { id: string; cookie: string }
let beto: { id: string; cookie: string }

async function limpiar() {
  await prisma.rutaFormativa.deleteMany()
  await prisma.inscripcionCurso.deleteMany()
  await prisma.preferenciasFormativas.deleteMany()
  await prisma.curso.deleteMany()
  await prisma.recursoFormativo.deleteMany()
}

beforeAll(async () => {
  await limpiar()
  await prisma.usuario.deleteMany({ where: { correo: { in: Object.values(CORREOS) } } })
  admin = await registrar('Grace', CORREOS.admin)
  ana = await registrar('Ana', CORREOS.ana)
  beto = await registrar('Beto', CORREOS.beto)
  await prisma.usuario.update({
    where: { idUsuario: admin.id },
    data: { tipoCuenta: 'administrador' },
  })
})

beforeEach(limpiar)

afterAll(async () => {
  await prisma.$disconnect()
})

function como(quien: { cookie: string }) {
  return {
    get: (ruta: string) => request(app).get(ruta).set('Cookie', quien.cookie),
    post: (ruta: string, cuerpo: object = {}) =>
      request(app).post(ruta).set('Cookie', quien.cookie).send(cuerpo),
    put: (ruta: string, cuerpo: object = {}) =>
      request(app).put(ruta).set('Cookie', quien.cookie).send(cuerpo),
    patch: (ruta: string, cuerpo: object) =>
      request(app).patch(ruta).set('Cookie', quien.cookie).send(cuerpo),
  }
}

interface CursoCreado {
  idCurso: string
  lecciones: string[]
}

async function crearCurso(
  titulo: string,
  elementos: string[],
  nivel = 'inicial',
): Promise<CursoCreado> {
  const { body } = await como(admin)
    .post('/api/admin/cursos', {
      titulo,
      resumen: 'Resumen.',
      objetivo: 'Objetivo.',
      area: 'comunicacion',
      elementos,
      nivel,
      practicaFinal: 'Algo útil.',
    })
    .expect(201)
  const idCurso = body.curso.idCurso as string
  for (const leccion of [
    { tipo: 'practica', titulo: 'Práctica', contenido: 'Haz esto.', duracionMin: 10 },
    { tipo: 'reflexion', titulo: 'Reflexión', contenido: '¿Qué harás?', duracionMin: 5 },
  ]) {
    await como(admin).post(`/api/admin/cursos/${idCurso}/lecciones`, leccion).expect(201)
  }
  const publicado = await como(admin)
    .patch(`/api/admin/cursos/${idCurso}`, { estatus: 'publicado' })
    .expect(200)
  return {
    idCurso,
    lecciones: publicado.body.curso.lecciones.map((l: { idLeccion: string }) => l.idLeccion),
  }
}

async function crearRuta(
  titulo: string,
  cursos: CursoCreado[],
  { destacada = false, publicar = true } = {},
): Promise<string> {
  const { body } = await como(admin)
    .post('/api/admin/rutas', { titulo, finalidad: `Para ${titulo}.`, destacada })
    .expect(201)
  const idRuta = body.ruta.idRuta as string
  await como(admin)
    .put(`/api/admin/rutas/${idRuta}/cursos`, { cursos: cursos.map((c) => c.idCurso) })
    .expect(200)
  if (publicar) {
    await como(admin).patch(`/api/admin/rutas/${idRuta}`, { estatus: 'publicado' }).expect(200)
  }
  return idRuta
}

async function terminar(quien: { cookie: string }, curso: CursoCreado) {
  for (const idLeccion of curso.lecciones) {
    await como(quien)
      .put(`/api/cursos/${curso.idCurso}/lecciones/${idLeccion}/completada`)
      .expect(200)
  }
}

/** Dos rutas: comunicación (Interacción promotora) y organización
 * (Responsabilidades e Interdependencia), esta última destacada. */
async function catalogo() {
  const clara = await crearCurso('Comunicación clara', ['interaccion_promotora'])
  const escucha = await crearCurso('Escucha activa', ['interaccion_promotora'])
  const acuerdos = await crearCurso('Acuerdos', ['responsabilidades'])
  const metas = await crearCurso('Metas compartidas', ['interdependencia_positiva'])
  const comunicacion = await crearRuta('Comunicación', [clara, escucha])
  const organizacion = await crearRuta('Organización', [acuerdos, metas], { destacada: true })
  return { clara, escucha, acuerdos, metas, comunicacion, organizacion }
}

async function recomendaciones(quien: { cookie: string }, query = '') {
  const respuesta = await como(quien).get(`/api/me/rutas/recomendadas${query}`).expect(200)
  return respuesta.body as {
    modo: string
    recomendaciones: {
      idRuta: string
      puntaje: number
      razones: string[]
      senales: Record<string, number | null>
      ruta: { titulo: string; cursos: { idCurso: string; estado: string }[] }
    }[]
  }
}

describe('autorización', () => {
  it.each([
    ['get', '/api/me/preferencias-formativas'],
    ['put', '/api/me/preferencias-formativas'],
    ['get', '/api/me/rutas/recomendadas'],
  ])('%s %s responde 401 sin sesión', async (metodo, ruta) => {
    expect((await request(app)[metodo as 'get'](ruta)).status).toBe(401)
  })
})

describe('preferencias formativas', () => {
  it('empiezan vacías, se guardan sin repetir y son de cada quien', async () => {
    expect((await como(ana).get('/api/me/preferencias-formativas')).body).toEqual({
      preferencias: { elementos: [] },
    })
    const guardadas = await como(ana)
      .put('/api/me/preferencias-formativas', {
        elementos: ['interaccion_promotora', 'interaccion_promotora', 'responsabilidades'],
      })
      .expect(200)
    expect(guardadas.body.preferencias.elementos).toEqual([
      'interaccion_promotora',
      'responsabilidades',
    ])
    expect((await como(beto).get('/api/me/preferencias-formativas')).body.preferencias).toEqual({
      elementos: [],
    })
  })

  it('admite como máximo dos elementos válidos', async () => {
    const tres = await como(ana).put('/api/me/preferencias-formativas', {
      elementos: ['responsabilidades', 'interaccion_promotora', 'procesamiento_grupal'],
    })
    expect(tres.status).toBe(400)
    expect(
      (await como(ana).put('/api/me/preferencias-formativas', { elementos: ['no_existe'] })).status,
    ).toBe(400)
    expect((await como(ana).put('/api/me/preferencias-formativas', {})).status).toBe(400)
  })
})

describe('rutas recomendadas', () => {
  it('sin datos de la persona: modo editorial y la destacada primero', async () => {
    const c = await catalogo()
    const r = await recomendaciones(ana)
    expect(r.modo).toBe('editorial')
    expect(r.recomendaciones[0]).toMatchObject({
      idRuta: c.organizacion,
      razones: ['Ruta destacada por el equipo de contenido para empezar.'],
    })
  })

  it('con una preferencia, la ruta que la trabaja va primero y lo explica', async () => {
    const c = await catalogo()
    await como(ana)
      .put('/api/me/preferencias-formativas', { elementos: ['interaccion_promotora'] })
      .expect(200)

    const r = await recomendaciones(ana)
    expect(r.modo).toBe('personalizado')
    expect(r.recomendaciones[0].idRuta).toBe(c.comunicacion)
    expect(r.recomendaciones[0].senales.interes).toBe(1)
    expect(r.recomendaciones[0].razones[0]).toBe(
      'Trabaja Interacción promotora, que elegiste fortalecer.',
    )
  })

  it('una ruta terminada ya no se recomienda y el avance viene por curso', async () => {
    const c = await catalogo()
    await terminar(ana, c.clara)
    let r = await recomendaciones(ana)
    const comunicacion = r.recomendaciones.find((x) => x.idRuta === c.comunicacion)
    expect(comunicacion?.ruta.cursos.map((x) => x.estado)).toEqual(['completado', 'pendiente'])

    await terminar(ana, c.escucha)
    r = await recomendaciones(ana)
    expect(r.recomendaciones.map((x) => x.idRuta)).toEqual([c.organizacion])
  })

  it('solo usa los datos de quien pregunta', async () => {
    const c = await catalogo()
    await como(beto)
      .put('/api/me/preferencias-formativas', { elementos: ['interaccion_promotora'] })
      .expect(200)
    await terminar(beto, c.clara)

    const r = await recomendaciones(ana)
    expect(r.modo).toBe('editorial')
    expect(r.recomendaciones[0].idRuta).toBe(c.organizacion)
  })

  it('solo recomienda rutas publicadas', async () => {
    const c = await catalogo()
    const borrador = await crearRuta('En borrador', [c.clara, c.acuerdos], { publicar: false })
    await como(admin)
      .patch(`/api/admin/rutas/${c.comunicacion}`, { estatus: 'retirado' })
      .expect(200)

    const ids = (await recomendaciones(ana)).recomendaciones.map((x) => x.idRuta)
    expect(ids).toEqual([c.organizacion])
    expect(ids).not.toContain(borrador)
  })

  it('un curso retirado dentro de una ruta no expone su título', async () => {
    const c = await catalogo()
    await como(admin)
      .patch(`/api/admin/cursos/${c.clara.idCurso}`, { estatus: 'retirado' })
      .expect(200)

    const respuesta = await como(ana).get('/api/me/rutas/recomendadas?limite=10').expect(200)
    const comunicacion = respuesta.body.recomendaciones.find(
      (r: { idRuta: string }) => r.idRuta === c.comunicacion,
    )
    expect(comunicacion.ruta.cursos[0]).toMatchObject({
      idCurso: c.clara.idCurso,
      titulo: 'Curso no disponible',
      nivel: null,
      duracionMin: 0,
      disponible: false,
    })
    expect(JSON.stringify(respuesta.body)).not.toContain('Comunicación clara')
  })

  it('respeta el límite y lo valida', async () => {
    await catalogo()
    expect((await recomendaciones(ana, '?limite=1')).recomendaciones).toHaveLength(1)
    expect((await como(ana).get('/api/me/rutas/recomendadas?limite=0')).status).toBe(400)
    expect((await como(ana).get('/api/me/rutas/recomendadas?limite=11')).status).toBe(400)
  })

  it('pedir recomendaciones no crea inscripciones ni preferencias', async () => {
    await catalogo()
    await recomendaciones(ana)
    expect(await prisma.inscripcionCurso.count()).toBe(0)
    expect(await prisma.preferenciasFormativas.count()).toBe(0)
  })
})
