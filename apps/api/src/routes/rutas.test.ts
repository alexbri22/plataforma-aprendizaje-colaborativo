import request, { type Response } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

const app = createApp()

const CORREOS = { admin: 'admin.rutas@ejemplo.com', usuario: 'usuario.rutas@ejemplo.com' }

function datosDe(nombre: string, correo: string) {
  return {
    nombre,
    apellidoPaterno: 'Prueba',
    apellidoMaterno: 'Rutas',
    nivelEstudios: 'Licenciatura',
    institucionEducativa: 'UNAM',
    correo,
    contrasena: 'contrasena-larga',
  }
}

const PRACTICA = {
  tipo: 'practica',
  titulo: 'Redacta tu acuerdo',
  contenido: 'Usa la plantilla para escribir tres compromisos.',
  duracionMin: 10,
}

const REFLEXION = {
  tipo: 'reflexion',
  titulo: '¿Qué cambiarás?',
  contenido: '¿Qué harás distinto en tu siguiente reunión?',
  duracionMin: 5,
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
let usuario: { id: string; cookie: string }

async function limpiar() {
  // Las rutas primero: la llave RESTRICT de cursos_ruta impide borrar cursos.
  await prisma.rutaFormativa.deleteMany()
  await prisma.inscripcionCurso.deleteMany()
  await prisma.curso.deleteMany()
  await prisma.recursoFormativo.deleteMany()
}

beforeAll(async () => {
  await limpiar()
  await prisma.usuario.deleteMany({ where: { correo: { in: Object.values(CORREOS) } } })
  admin = await registrar('Grace', CORREOS.admin)
  usuario = await registrar('Ada', CORREOS.usuario)
  await prisma.usuario.update({
    where: { idUsuario: admin.id },
    data: { tipoCuenta: 'administrador' },
  })
})

beforeEach(limpiar)

afterAll(async () => {
  await prisma.$disconnect()
})

const comoAdmin = {
  get: (ruta: string) => request(app).get(ruta).set('Cookie', admin.cookie),
  post: (ruta: string, cuerpo: object) =>
    request(app).post(ruta).set('Cookie', admin.cookie).send(cuerpo),
  patch: (ruta: string, cuerpo: object) =>
    request(app).patch(ruta).set('Cookie', admin.cookie).send(cuerpo),
  put: (ruta: string, cuerpo: object) =>
    request(app).put(ruta).set('Cookie', admin.cookie).send(cuerpo),
  delete: (ruta: string) => request(app).delete(ruta).set('Cookie', admin.cookie),
}

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms))
}

interface OpcionesCurso {
  titulo: string
  elementos?: string[]
  nivel?: string
  publicar?: boolean
}

/** Curso con una práctica (10 min) y una reflexión (5 min): 15 minutos. */
async function crearCurso({
  titulo,
  elementos = ['responsabilidades'],
  nivel = 'inicial',
  publicar = true,
}: OpcionesCurso): Promise<string> {
  const { body } = await comoAdmin
    .post('/api/admin/cursos', {
      titulo,
      resumen: 'Resumen.',
      objetivo: 'Objetivo.',
      area: 'organizacion',
      elementos,
      nivel,
      practicaFinal: 'Un acuerdo.',
    })
    .expect(201)
  const idCurso = body.curso.idCurso as string
  await comoAdmin.post(`/api/admin/cursos/${idCurso}/lecciones`, PRACTICA).expect(201)
  await comoAdmin.post(`/api/admin/cursos/${idCurso}/lecciones`, REFLEXION).expect(201)
  if (publicar) {
    await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { estatus: 'publicado' }).expect(200)
  }
  return idCurso
}

async function crearRuta(datos: object = {}): Promise<string> {
  const { body } = await comoAdmin
    .post('/api/admin/rutas', { titulo: 'Comunicación y confianza', ...datos })
    .expect(201)
  return body.ruta.idRuta as string
}

function ponerCursos(idRuta: string, cursos: string[], extra: object = {}) {
  return comoAdmin.put(`/api/admin/rutas/${idRuta}/cursos`, { cursos, ...extra })
}

/** Ruta publicada con dos cursos publicados. */
async function rutaPublicada(): Promise<{ idRuta: string; cursos: [string, string] }> {
  const a = await crearCurso({ titulo: 'Comunicación clara' })
  const b = await crearCurso({ titulo: 'Escucha activa' })
  const idRuta = await crearRuta({ finalidad: 'Expresarse con claridad.' })
  await ponerCursos(idRuta, [a, b]).expect(200)
  await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, { estatus: 'publicado' }).expect(200)
  return { idRuta, cursos: [a, b] }
}

describe('autorización', () => {
  const rutas: [string, string][] = [
    ['get', '/api/admin/rutas'],
    ['get', '/api/admin/rutas/x'],
    ['post', '/api/admin/rutas'],
    ['patch', '/api/admin/rutas/x'],
    ['put', '/api/admin/rutas/x/cursos'],
    ['delete', '/api/admin/rutas/x'],
  ]

  it.each(rutas)('%s %s responde 401 sin sesión', async (metodo, ruta) => {
    expect((await request(app)[metodo as 'get'](ruta)).status).toBe(401)
  })

  it.each(rutas)('%s %s responde 403 a una cuenta de usuario', async (metodo, ruta) => {
    const respuesta = await request(app)[metodo as 'get'](ruta).set('Cookie', usuario.cookie)
    expect(respuesta.status).toBe(403)
  })
})

describe('ficha de la ruta', () => {
  it('nace en borrador, sin cursos y al final del orden', async () => {
    await crearRuta({ titulo: 'Primera' })
    const { body } = await comoAdmin.post('/api/admin/rutas', { titulo: 'Segunda' }).expect(201)
    expect(body.ruta).toMatchObject({
      titulo: 'Segunda',
      estatus: 'borrador',
      orden: 1,
      numCursos: 0,
      destacada: false,
      cursos: [],
    })
  })

  it('exige título y no nace publicada', async () => {
    expect((await comoAdmin.post('/api/admin/rutas', {})).status).toBe(400)
    const publicada = await comoAdmin.post('/api/admin/rutas', {
      titulo: 'X',
      estatus: 'publicado',
    })
    expect(publicada.status).toBe(400)
    expect(publicada.body.detallePorCampo.estatus).toBeDefined()
  })

  it('lista paginada para el panel', async () => {
    await crearRuta({ titulo: 'Uno' })
    await crearRuta({ titulo: 'Dos' })
    const { body } = await comoAdmin.get('/api/admin/rutas?porPagina=1').expect(200)
    expect(body.rutas.map((r: { titulo: string }) => r.titulo)).toEqual(['Uno'])
    expect(body.paginacion).toMatchObject({ total: 2, totalPaginas: 2 })
  })

  it('un guardado con una versión vieja responde 409', async () => {
    const idRuta = await crearRuta()
    await comoAdmin
      .patch(`/api/admin/rutas/${idRuta}`, { titulo: 'A', versionFicha: 0 })
      .expect(200)
    const vieja = await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, {
      titulo: 'B',
      versionFicha: 0,
    })
    expect(vieja.status).toBe(409)
    expect(vieja.body.codigo).toBe('ruta_desactualizada')
    const cursos = await ponerCursos(idRuta, [], { versionFicha: 0 })
    expect(cursos.body.codigo).toBe('ruta_desactualizada')
  })
})

describe('cursos de la ruta', () => {
  it('guarda la lista en orden y calcula elementos, nivel y duración', async () => {
    const a = await crearCurso({
      titulo: 'A',
      elementos: ['interaccion_promotora', 'responsabilidades'],
      nivel: 'inicial',
    })
    const b = await crearCurso({
      titulo: 'B',
      elementos: ['interaccion_promotora'],
      nivel: 'intermedio',
    })
    const idRuta = await crearRuta()

    const { body } = await ponerCursos(idRuta, [b, a]).expect(200)
    expect(body.ruta.cursos.map((c: { titulo: string }) => c.titulo)).toEqual(['B', 'A'])
    expect(body.ruta.derivado).toEqual({
      elementos: [
        { elemento: 'interaccion_promotora', cursos: 2 },
        { elemento: 'responsabilidades', cursos: 1 },
      ],
      nivelInicial: 'intermedio',
      duracionMin: 30,
      numCursos: 2,
    })

    const otra = await ponerCursos(idRuta, [a]).expect(200)
    expect(otra.body.ruta.cursos.map((c: { titulo: string }) => c.titulo)).toEqual(['A'])
    expect(await prisma.cursoRuta.count()).toBe(1)
  })

  it('rechaza más de 5 cursos, repetidos o inexistentes', async () => {
    const idRuta = await crearRuta()
    const ids = await Promise.all(
      Array.from({ length: 6 }, (_, i) => crearCurso({ titulo: `Curso ${i}`, publicar: false })),
    )
    expect((await ponerCursos(idRuta, ids)).status).toBe(400)
    expect((await ponerCursos(idRuta, [ids[0], ids[0]])).status).toBe(400)
    const inexistente = await ponerCursos(idRuta, [ids[0], 'no-existe'])
    expect(inexistente.status).toBe(404)
    expect(await prisma.cursoRuta.count()).toBe(0)
  })

  it('un borrador acepta cursos sin publicar', async () => {
    const idRuta = await crearRuta()
    const borrador = await crearCurso({ titulo: 'Borrador', publicar: false })
    await ponerCursos(idRuta, [borrador]).expect(200)
  })
})

describe('publicar', () => {
  it('exige finalidad, al menos 2 cursos y todos publicados', async () => {
    const publicado = await crearCurso({ titulo: 'Publicado' })
    const borrador = await crearCurso({ titulo: 'En borrador', publicar: false })
    const idRuta = await crearRuta()
    await ponerCursos(idRuta, [publicado]).expect(200)

    let respuesta = await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, { estatus: 'publicado' })
    expect(respuesta.status).toBe(400)
    expect(Object.keys(respuesta.body.detallePorCampo).sort()).toEqual(['cursos', 'finalidad'])

    await ponerCursos(idRuta, [publicado, borrador]).expect(200)
    respuesta = await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, {
      estatus: 'publicado',
      finalidad: 'Para qué sirve.',
    })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.cursos).toContain('En borrador')

    await comoAdmin.patch(`/api/admin/cursos/${borrador}`, { estatus: 'publicado' }).expect(200)
    respuesta = await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, {
      estatus: 'publicado',
      finalidad: 'Para qué sirve.',
    })
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.ruta.estatus).toBe('publicado')
  })

  it('una ruta publicada sigue cumpliendo los mínimos al editarla', async () => {
    const { idRuta, cursos } = await rutaPublicada()
    expect((await ponerCursos(idRuta, [cursos[0]])).status).toBe(400)
    const borrador = await crearCurso({ titulo: 'Nuevo en borrador', publicar: false })
    expect((await ponerCursos(idRuta, [...cursos, borrador])).status).toBe(400)
    expect((await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, { finalidad: '' })).status).toBe(
      400,
    )
    expect(
      (await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, { estatus: 'borrador' })).status,
    ).toBe(400)
  })

  it('un curso retirado después deja la ruta publicada, con el curso no disponible', async () => {
    const { idRuta, cursos } = await rutaPublicada()
    await comoAdmin.patch(`/api/admin/cursos/${cursos[0]}`, { estatus: 'retirado' }).expect(200)

    const { body } = await comoAdmin.get(`/api/admin/rutas/${idRuta}`).expect(200)
    expect(body.ruta.estatus).toBe('publicado')
    expect(body.ruta.cursos.map((c: { disponible: boolean }) => c.disponible)).toEqual([
      false,
      true,
    ])
    expect(body.ruta.derivado).toMatchObject({ duracionMin: 15, numCursos: 2 })

    // Y no impide editar la ruta ni reordenar lo que tiene.
    await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, { titulo: 'Nuevo título' }).expect(200)
    await ponerCursos(idRuta, [cursos[1], cursos[0]]).expect(200)
  })
})

describe('ruta destacada', () => {
  it('desmarcar otra ruta sube su versión: un editor viejo de esa ruta recibe 409', async () => {
    const a = await crearRuta({ titulo: 'A', destacada: true })
    const { body } = await comoAdmin.get(`/api/admin/rutas/${a}`).expect(200)
    const versionLeida = body.ruta.versionFicha as number

    const b = await crearRuta({ titulo: 'B' })
    await comoAdmin.patch(`/api/admin/rutas/${b}`, { destacada: true }).expect(200)

    // El editor de A sigue con su formulario viejo (destacada: true).
    const viejo = await comoAdmin.patch(`/api/admin/rutas/${a}`, {
      titulo: 'A editada',
      destacada: true,
      versionFicha: versionLeida,
    })
    expect(viejo.status).toBe(409)
    expect(viejo.body.codigo).toBe('ruta_desactualizada')
    const destacadas = await prisma.rutaFormativa.findMany({ where: { destacada: true } })
    expect(destacadas.map((r) => r.idRuta)).toEqual([b])
  })

  it('marcar una desmarca la anterior', async () => {
    const a = await crearRuta({ titulo: 'A', destacada: true })
    const b = await crearRuta({ titulo: 'B' })
    await comoAdmin.patch(`/api/admin/rutas/${b}`, { destacada: true }).expect(200)

    const destacadas = await prisma.rutaFormativa.findMany({ where: { destacada: true } })
    expect(destacadas.map((r) => r.idRuta)).toEqual([b])
    expect(a).not.toBe(b)
  })
})

describe('eliminar', () => {
  it('un curso que forma parte de una ruta no se elimina; la ruta sí, y el curso queda', async () => {
    const { idRuta, cursos } = await rutaPublicada()
    const respuesta = await comoAdmin.delete(`/api/admin/cursos/${cursos[0]}`)
    expect(respuesta.status).toBe(409)
    expect(respuesta.body.codigo).toBe('curso_en_ruta')
    expect(respuesta.body.mensaje).toContain('Comunicación y confianza')

    await comoAdmin.delete(`/api/admin/rutas/${idRuta}`).expect(204)
    expect(await prisma.curso.count({ where: { idCurso: cursos[0] } })).toBe(1)
    await comoAdmin.delete(`/api/admin/cursos/${cursos[0]}`).expect(204)
    await comoAdmin.delete(`/api/admin/rutas/${idRuta}`).expect(404)
  })
})

describe('cambios simultáneos', () => {
  // La transacción de la prueba hace de otro administrador que está marcando
  // una ruta B: ya tiene el candado y le falta desmarcar la destacada A. A la
  // vez se guarda A (que el editor manda con destacada: true). Si ese
  // guardado pide el candado después de bloquear la fila de A, cada uno
  // espera al otro y Postgres aborta uno de los dos.
  it('guardar la ruta que ya es destacada no se traba con quien marca otra', async () => {
    const a = await crearRuta({ titulo: 'A', destacada: true })
    const b = await crearRuta({ titulo: 'B' })

    let guardarA: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rutas_formativas.destacada'))`
      guardarA = comoAdmin
        .patch(`/api/admin/rutas/${a}`, { titulo: 'A editada', destacada: true })
        .then((r) => r)
      await esperar(300)
      await tx.rutaFormativa.updateMany({
        where: { destacada: true, idRuta: { not: b } },
        data: { destacada: false, versionFicha: { increment: 1 } },
      })
      await tx.rutaFormativa.update({ where: { idRuta: b }, data: { destacada: true } })
    })

    expect((await guardarA)?.status).toBe(200)
  })

  // La transacción de la prueba hace de otro administrador que está marcando
  // la ruta A como destacada (ya desmarcó las demás, aún no confirma). Sin el
  // candado consultivo, marcar B a la vez no ve a A y quedan dos destacadas.
  it('nunca quedan dos rutas destacadas', async () => {
    const a = await crearRuta({ titulo: 'A' })
    const b = await crearRuta({ titulo: 'B' })

    let marcarB: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rutas_formativas.destacada'))`
      await tx.rutaFormativa.update({ where: { idRuta: a }, data: { destacada: true } })
      marcarB = comoAdmin.patch(`/api/admin/rutas/${b}`, { destacada: true }).then((r) => r)
      await esperar(300)
    })

    expect((await marcarB)?.status).toBe(200)
    expect(await prisma.rutaFormativa.count({ where: { destacada: true } })).toBe(1)
  })

  // La transacción de la prueba hace de un administrador que está eliminando
  // un curso. Sin el bloqueo compartido de los cursos, la lista lo da por
  // existente, la inserción choca con la llave foránea y responde 500.
  it('agregar a la ruta un curso que se está eliminando responde 404', async () => {
    const idCurso = await crearCurso({ titulo: 'Por borrar', publicar: false })
    const idRuta = await crearRuta()

    let poner: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_curso FROM cursos WHERE id_curso = ${idCurso} FOR UPDATE`
      await tx.curso.delete({ where: { idCurso } })
      poner = ponerCursos(idRuta, [idCurso]).then((r) => r)
      await esperar(300)
    })

    expect((await poner)?.status).toBe(404)
  })
})

describe('catálogo y ficha públicos', () => {
  it('sin sesión: solo publicadas, la destacada primero', async () => {
    const { idRuta } = await rutaPublicada()
    const destacada = await rutaPublicada()
    await comoAdmin.patch(`/api/admin/rutas/${destacada.idRuta}`, { destacada: true }).expect(200)
    await crearRuta({ titulo: 'En borrador' })

    const { body } = await request(app).get('/api/rutas').expect(200)
    expect(body.rutas.map((r: { idRuta: string }) => r.idRuta)).toEqual([destacada.idRuta, idRuta])
    expect(body.paginacion.total).toBe(2)
    expect(body.rutas[0]).toMatchObject({ destacada: true, derivado: { numCursos: 2 } })
  })

  it('la ficha trae los cursos en orden; un borrador o retirada responde 404', async () => {
    const { idRuta } = await rutaPublicada()
    const { body } = await request(app).get(`/api/rutas/${idRuta}`).expect(200)
    expect(body.ruta.cursos.map((c: { titulo: string }) => c.titulo)).toEqual([
      'Comunicación clara',
      'Escucha activa',
    ])

    const borrador = await crearRuta({ titulo: 'Borrador' })
    await request(app).get(`/api/rutas/${borrador}`).expect(404)
    await comoAdmin.patch(`/api/admin/rutas/${idRuta}`, { estatus: 'retirado' }).expect(200)
    await request(app).get(`/api/rutas/${idRuta}`).expect(404)
  })

  it('un curso retirado se ve como no disponible, sin su título', async () => {
    const { idRuta, cursos } = await rutaPublicada()
    await comoAdmin.patch(`/api/admin/cursos/${cursos[0]}`, { estatus: 'retirado' }).expect(200)

    const { body } = await request(app).get(`/api/rutas/${idRuta}`).expect(200)
    expect(body.ruta.cursos[0]).toEqual({
      idCurso: cursos[0],
      titulo: 'Curso no disponible',
      nivel: null,
      duracionMin: 0,
      disponible: false,
    })
    expect(JSON.stringify(body)).not.toContain('Comunicación clara')
  })
})
