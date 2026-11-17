import { normalizarFolio } from '@plataforma/shared'
import request, { type Response } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

// Constancias de finalización (docs/diseno-desarrollo-formacion.md, nota del
// incremento 5).

const app = createApp()

const CORREOS = {
  admin: 'admin.constancias@ejemplo.com',
  ana: 'ana.constancias@ejemplo.com',
  beto: 'beto.constancias@ejemplo.com',
}

function datosDe(nombre: string, correo: string) {
  return {
    nombre,
    apellidoPaterno: 'Prueba',
    apellidoMaterno: 'Constancias',
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

type Persona = { id: string; cookie: string }
let admin: Persona
let ana: Persona
let beto: Persona

async function limpiar() {
  // Las constancias no tienen llave hacia cursos ni rutas: se borran aparte.
  await prisma.constancia.deleteMany()
  await prisma.rutaFormativa.deleteMany()
  await prisma.inscripcionCurso.deleteMany()
  await prisma.curso.deleteMany()
  await prisma.recursoFormativo.deleteMany()
  await prisma.preferenciasFormativas.deleteMany()
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
    delete: (ruta: string) => request(app).delete(ruta).set('Cookie', quien.cookie),
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms))
}

async function crearRecurso(): Promise<string> {
  const respuesta = await como(admin)
    .post('/api/admin/recursos', {
      seccion: 'como_colaborar',
      titulo: 'Plantilla de acuerdos claros',
      resumen: 'Un acuerdo de una página.',
      tipoRecurso: 'texto',
      contenido: 'Contenido',
      area: 'organizacion',
      elementos: ['responsabilidades'],
      duracionMin: 4,
      fuente: 'Co3',
      licencia: 'CC BY 4.0',
      estatus: 'publicado',
    })
    .expect(201)
  return respuesta.body.recurso.idRecurso as string
}

interface CursoDePrueba {
  idCurso: string
  idRecurso: string
  titulo: string
  /** En orden: recurso (4 min), práctica (10 min), reflexión (5 min). */
  lecciones: [string, string, string]
}

/** Curso publicado de 19 minutos con tres lecciones obligatorias. */
async function cursoPublicado(
  titulo: string,
  elementos: string[] = ['responsabilidades'],
): Promise<CursoDePrueba> {
  const idRecurso = await crearRecurso()
  const { body } = await como(admin)
    .post('/api/admin/cursos', {
      titulo,
      resumen: 'Resumen del curso.',
      objetivo: 'Objetivo del curso.',
      area: 'organizacion',
      elementos,
      nivel: 'inicial',
      practicaFinal: 'Una práctica.',
    })
    .expect(201)
  const idCurso = body.curso.idCurso as string
  const lecciones = [
    { tipo: 'recurso', idRecurso },
    { tipo: 'practica', titulo: 'Practica', contenido: 'Pasos.', duracionMin: 10 },
    { tipo: 'reflexion', titulo: 'Reflexiona', contenido: '¿Qué cambiarás?', duracionMin: 5 },
  ]
  for (const leccion of lecciones) {
    await como(admin).post(`/api/admin/cursos/${idCurso}/lecciones`, leccion).expect(201)
  }
  const publicado = await como(admin)
    .patch(`/api/admin/cursos/${idCurso}`, { estatus: 'publicado' })
    .expect(200)
  const ids = publicado.body.curso.lecciones.map((l: { idLeccion: string }) => l.idLeccion)
  return { idCurso, idRecurso, titulo, lecciones: ids as [string, string, string] }
}

function marcar(quien: Persona, c: CursoDePrueba, idLeccion: string) {
  return como(quien).put(`/api/cursos/${c.idCurso}/lecciones/${idLeccion}/completada`)
}

/** Marca todas las lecciones y devuelve la respuesta de la última. */
async function terminar(quien: Persona, c: CursoDePrueba): Promise<Response> {
  await marcar(quien, c, c.lecciones[0]).expect(200)
  await marcar(quien, c, c.lecciones[1]).expect(200)
  return marcar(quien, c, c.lecciones[2]).expect(200)
}

async function rutaCon(
  cursos: CursoDePrueba[],
  estatus: 'borrador' | 'publicado' = 'publicado',
): Promise<string> {
  const { body } = await como(admin)
    .post('/api/admin/rutas', {
      titulo: 'Organización y corresponsabilidad',
      finalidad: 'Coordinar.',
    })
    .expect(201)
  const idRuta = body.ruta.idRuta as string
  await como(admin)
    .put(`/api/admin/rutas/${idRuta}/cursos`, { cursos: cursos.map((c) => c.idCurso) })
    .expect(200)
  if (estatus === 'publicado') {
    await como(admin).patch(`/api/admin/rutas/${idRuta}`, { estatus: 'publicado' }).expect(200)
  }
  return idRuta
}

async function misConstancias(quien: Persona) {
  const { body } = await como(quien).get('/api/me/constancias').expect(200)
  return body as {
    publicas: boolean
    constancias: {
      folio: string
      tipo: 'curso' | 'ruta'
      titulo: string
      numCursos: number
      fechaFinalizacion: string
      idCurso: string | null
      idRuta: string | null
    }[]
  }
}

async function constanciaDeRuta(quien: Persona, idRuta: string) {
  return (await misConstancias(quien)).constancias.find((c) => c.idRuta === idRuta)
}

describe('autorización', () => {
  const rutas: [string, string][] = [
    ['get', '/api/me/constancias'],
    ['put', '/api/me/constancias/visibilidad'],
    ['get', '/api/usuarios/x/constancias'],
  ]

  it.each(rutas)('%s %s responde 401 sin sesión', async (metodo, ruta) => {
    const respuesta = await request(app)[metodo as 'get'](ruta)
    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('sin_sesion')
  })

  it('la verificación por folio es pública', async () => {
    const respuesta = await request(app).get('/api/constancias/CO3-0000-0000')
    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('constancia_no_encontrada')
  })
})

describe('constancia de curso', () => {
  it('terminar el curso emite una con folio, y la marca que lo termina la trae', async () => {
    const c = await cursoPublicado('Acuerdos y responsabilidades claras')
    const primera = await marcar(ana, c, c.lecciones[0]).expect(200)
    expect(primera.body.constanciasNuevas).toEqual([])
    await marcar(ana, c, c.lecciones[1]).expect(200)
    const ultima = await marcar(ana, c, c.lecciones[2]).expect(200)

    expect(ultima.body.constanciasNuevas).toEqual([
      {
        folio: expect.any(String),
        tipo: 'curso',
        titulo: c.titulo,
        numCursos: 0,
        fechaFinalizacion: ultima.body.progreso.fechaFinalizacion,
      },
    ])
    const { folio } = ultima.body.constanciasNuevas[0]
    expect(normalizarFolio(folio)).toBe(folio)
    expect((await misConstancias(ana)).constancias).toEqual([
      expect.objectContaining({ folio, idCurso: c.idCurso, idRuta: null }),
    ])
  })

  it('desmarcar y volver a marcar no emite otra ni quita la que hay', async () => {
    const c = await cursoPublicado('Acuerdos')
    await terminar(ana, c)
    await como(ana).delete(`/api/cursos/${c.idCurso}/lecciones/${c.lecciones[2]}/completada`)
    const otra = await marcar(ana, c, c.lecciones[2]).expect(200)
    expect(otra.body.constanciasNuevas).toEqual([])
    expect((await misConstancias(ana)).constancias).toHaveLength(1)
  })

  it('guarda el título, los elementos y la duración de cuando se emitió', async () => {
    const c = await cursoPublicado('Acuerdos', ['responsabilidades', 'interdependencia_positiva'])
    const { body } = await terminar(ana, c)
    const folio = body.constanciasNuevas[0].folio as string

    await como(admin).patch(`/api/admin/cursos/${c.idCurso}`, { titulo: 'Otro título' }).expect(200)
    await como(admin)
      .post(`/api/admin/cursos/${c.idCurso}/lecciones`, {
        tipo: 'practica',
        titulo: 'Nueva',
        contenido: 'Más pasos.',
        duracionMin: 10,
      })
      .expect(201)

    const verificada = await request(app).get(`/api/constancias/${folio}`).expect(200)
    expect(verificada.body.constancia).toMatchObject({
      titulo: 'Acuerdos',
      elementos: ['responsabilidades', 'interdependencia_positiva'],
      duracionMin: 19,
      enCatalogo: true,
    })
  })

  it('un cambio del administrador que termina el curso también la emite', async () => {
    const c = await cursoPublicado('Acuerdos')
    const { body } = await como(admin)
      .post(`/api/admin/cursos/${c.idCurso}/lecciones`, {
        tipo: 'practica',
        titulo: 'Extra',
        contenido: 'Más pasos.',
        duracionMin: 10,
      })
      .expect(201)
    const extra = body.curso.lecciones.find((l: { titulo: string }) => l.titulo === 'Extra')
    await terminar(ana, c)
    expect((await misConstancias(ana)).constancias).toEqual([])

    await como(admin)
      .delete(`/api/admin/cursos/${c.idCurso}/lecciones/${extra.idLeccion}`)
      .expect(200)
    expect((await misConstancias(ana)).constancias).toEqual([
      expect.objectContaining({ tipo: 'curso', idCurso: c.idCurso }),
    ])
  })

  it('retirar el recurso de la lección pendiente también la emite', async () => {
    const c = await cursoPublicado('Acuerdos')
    await marcar(ana, c, c.lecciones[1]).expect(200)
    await marcar(ana, c, c.lecciones[2]).expect(200)
    await como(admin)
      .patch(`/api/admin/recursos/${c.idRecurso}`, { estatus: 'retirado' })
      .expect(200)
    expect((await misConstancias(ana)).constancias).toHaveLength(1)
  })

  it('un curso retirado conserva la constancia, que se sigue verificando', async () => {
    const c = await cursoPublicado('Acuerdos')
    const { body } = await terminar(ana, c)
    await como(admin).patch(`/api/admin/cursos/${c.idCurso}`, { estatus: 'retirado' }).expect(200)

    expect((await misConstancias(ana)).constancias).toHaveLength(1)
    const verificada = await request(app)
      .get(`/api/constancias/${body.constanciasNuevas[0].folio}`)
      .expect(200)
    expect(verificada.body.constancia).toMatchObject({ titulo: 'Acuerdos', enCatalogo: false })
  })

  it('emitirla no crea insignias ni otorgamientos', async () => {
    const antes = await prisma.insigniaOtorgada.count()
    await terminar(ana, await cursoPublicado('Acuerdos'))
    expect(await prisma.insigniaOtorgada.count()).toBe(antes)
  })
})

describe('constancia de ruta', () => {
  it('terminar el último curso de la ruta la emite, con la fecha de ese curso', async () => {
    const a = await cursoPublicado('Acuerdos', ['responsabilidades', 'interdependencia_positiva'])
    const b = await cursoPublicado('Reuniones', ['interaccion_promotora', 'responsabilidades'])
    const idRuta = await rutaCon([a, b])

    const primera = await terminar(ana, a)
    expect(primera.body.constanciasNuevas.map((c: { tipo: string }) => c.tipo)).toEqual(['curso'])
    const segunda = await terminar(ana, b)
    expect(segunda.body.constanciasNuevas.map((c: { tipo: string }) => c.tipo)).toEqual([
      'curso',
      'ruta',
    ])

    const ruta = await constanciaDeRuta(ana, idRuta)
    expect(ruta).toMatchObject({
      titulo: 'Organización y corresponsabilidad',
      numCursos: 2,
      fechaFinalizacion: segunda.body.progreso.fechaFinalizacion,
    })
    const verificada = await request(app).get(`/api/constancias/${ruta?.folio}`).expect(200)
    expect(verificada.body.constancia).toMatchObject({
      tipo: 'ruta',
      titulosCursos: ['Acuerdos', 'Reuniones'],
      // Del que más cursos trabajan al que menos; a igual número, en orden.
      elementos: ['responsabilidades', 'interdependencia_positiva', 'interaccion_promotora'],
      duracionMin: 38,
      enCatalogo: true,
    })
    // La ruta va antes que el curso que la terminó: tienen la misma fecha.
    expect((await misConstancias(ana)).constancias.map((c) => c.tipo)).toEqual([
      'ruta',
      'curso',
      'curso',
    ])
  })

  it('solo la recibe quien terminó todos sus cursos', async () => {
    const a = await cursoPublicado('Acuerdos')
    const b = await cursoPublicado('Reuniones')
    const idRuta = await rutaCon([a, b])
    await terminar(ana, a)
    await terminar(ana, b)
    await terminar(beto, a)
    expect(await constanciaDeRuta(ana, idRuta)).toBeDefined()
    expect(await constanciaDeRuta(beto, idRuta)).toBeUndefined()
  })

  it('agregar después un curso a la ruta no la quita', async () => {
    const [a, b, c] = [
      await cursoPublicado('A'),
      await cursoPublicado('B'),
      await cursoPublicado('C'),
    ]
    const idRuta = await rutaCon([a, b])
    await terminar(ana, a)
    await terminar(ana, b)
    await como(admin)
      .put(`/api/admin/rutas/${idRuta}/cursos`, { cursos: [a.idCurso, b.idCurso, c.idCurso] })
      .expect(200)
    expect(await constanciaDeRuta(ana, idRuta)).toMatchObject({ numCursos: 2 })
  })

  it('quitar de la ruta el curso que faltaba la emite', async () => {
    const [a, b, c] = [
      await cursoPublicado('A'),
      await cursoPublicado('B'),
      await cursoPublicado('C'),
    ]
    const idRuta = await rutaCon([a, b, c])
    await terminar(ana, a)
    await terminar(ana, b)
    expect(await constanciaDeRuta(ana, idRuta)).toBeUndefined()
    await como(admin)
      .put(`/api/admin/rutas/${idRuta}/cursos`, { cursos: [a.idCurso, b.idCurso] })
      .expect(200)
    expect(await constanciaDeRuta(ana, idRuta)).toMatchObject({ numCursos: 2 })
  })

  it('retirar el curso que faltaba la emite, sin ese curso', async () => {
    const [a, b, c] = [
      await cursoPublicado('A'),
      await cursoPublicado('B'),
      await cursoPublicado('C'),
    ]
    const idRuta = await rutaCon([a, b, c])
    await terminar(ana, a)
    await terminar(ana, b)
    await como(admin).patch(`/api/admin/cursos/${c.idCurso}`, { estatus: 'retirado' }).expect(200)
    const ruta = await constanciaDeRuta(ana, idRuta)
    const verificada = await request(app).get(`/api/constancias/${ruta?.folio}`).expect(200)
    expect(verificada.body.constancia.titulosCursos).toEqual(['A', 'B'])
  })

  it('publicar una ruta cuyos cursos ya terminaste la emite; en borrador, no', async () => {
    const a = await cursoPublicado('A')
    const b = await cursoPublicado('B')
    const idRuta = await rutaCon([a, b], 'borrador')
    await terminar(ana, a)
    await terminar(ana, b)
    expect(await constanciaDeRuta(ana, idRuta)).toBeUndefined()
    await como(admin).patch(`/api/admin/rutas/${idRuta}`, { estatus: 'publicado' }).expect(200)
    expect(await constanciaDeRuta(ana, idRuta)).toBeDefined()
  })

  it('borrar la ruta conserva su constancia', async () => {
    const a = await cursoPublicado('A')
    const b = await cursoPublicado('B')
    const idRuta = await rutaCon([a, b])
    await terminar(ana, a)
    await terminar(ana, b)
    const ruta = await constanciaDeRuta(ana, idRuta)
    await como(admin).delete(`/api/admin/rutas/${idRuta}`).expect(204)

    const verificada = await request(app).get(`/api/constancias/${ruta?.folio}`).expect(200)
    expect(verificada.body.constancia).toMatchObject({
      titulo: 'Organización y corresponsabilidad',
      enCatalogo: false,
    })
  })
})

describe('privacidad', () => {
  it('ocultas por defecto: ni otra persona ni el administrador las ven', async () => {
    await terminar(ana, await cursoPublicado('Acuerdos'))
    expect((await misConstancias(ana)).publicas).toBe(false)
    for (const quien of [beto, admin]) {
      const { body } = await como(quien).get(`/api/usuarios/${ana.id}/constancias`).expect(200)
      expect(body.constancias).toEqual([])
    }
  })

  it('al mostrarlas, otra persona ve qué terminó y cuándo, nada más', async () => {
    await terminar(ana, await cursoPublicado('Acuerdos'))
    const cambio = await como(ana).put('/api/me/constancias/visibilidad', { publicas: true })
    expect(cambio.status).toBe(200)
    expect(cambio.body).toEqual({ publicas: true })

    const { body } = await como(beto).get(`/api/usuarios/${ana.id}/constancias`).expect(200)
    expect(body.constancias).toHaveLength(1)
    expect(Object.keys(body.constancias[0]).sort()).toEqual(
      ['fechaFinalizacion', 'folio', 'numCursos', 'tipo', 'titulo'].sort(),
    )

    await como(ana).put('/api/me/constancias/visibilidad', { publicas: false }).expect(200)
    const oculto = await como(beto).get(`/api/usuarios/${ana.id}/constancias`).expect(200)
    expect(oculto.body.constancias).toEqual([])
  })

  it('mostrarlas no toca lo que quiere fortalecer, y al revés', async () => {
    await como(ana)
      .put('/api/me/preferencias-formativas', { elementos: ['procesamiento_grupal'] })
      .expect(200)
    await como(ana).put('/api/me/constancias/visibilidad', { publicas: true }).expect(200)
    const preferencias = await como(ana).get('/api/me/preferencias-formativas').expect(200)
    expect(preferencias.body.preferencias.elementos).toEqual(['procesamiento_grupal'])

    await como(ana).put('/api/me/preferencias-formativas', { elementos: [] }).expect(200)
    expect((await misConstancias(ana)).publicas).toBe(true)
  })

  it('rechaza una visibilidad que no sea sí o no', async () => {
    const respuesta = await como(ana).put('/api/me/constancias/visibilidad', { publicas: 'sí' })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.publicas).toBeDefined()
  })

  it('una cuenta que no existe responde igual que una con las constancias ocultas', async () => {
    const { body } = await como(beto).get('/api/usuarios/no-existe/constancias').expect(200)
    expect(body.constancias).toEqual([])
  })
})

describe('verificación pública', () => {
  it('sin sesión muestra a quién y qué hace constar, y nada más', async () => {
    const c = await cursoPublicado('Acuerdos')
    const { body } = await terminar(ana, c)
    const folio = body.constanciasNuevas[0].folio as string

    const respuesta = await request(app).get(`/api/constancias/${folio}`).expect(200)
    expect(respuesta.headers['x-robots-tag']).toBe('noindex')
    expect(respuesta.body.constancia).toMatchObject({
      folio,
      tipo: 'curso',
      nombre: 'Ana Prueba Constancias',
      titulo: 'Acuerdos',
      idCurso: c.idCurso,
    })
    expect(Object.keys(respuesta.body.constancia).sort()).toEqual(
      [
        'duracionMin',
        'elementos',
        'enCatalogo',
        'fechaEmision',
        'fechaFinalizacion',
        'folio',
        'idCurso',
        'idRuta',
        'nombre',
        'numCursos',
        'tipo',
        'titulo',
        'titulosCursos',
      ].sort(),
    )
  })

  it('acepta el folio en minúsculas', async () => {
    const { body } = await terminar(ana, await cursoPublicado('Acuerdos'))
    const folio = body.constanciasNuevas[0].folio as string
    await request(app).get(`/api/constancias/${folio.toLowerCase()}`).expect(200)
  })

  it('un folio mal escrito y uno que no existe responden igual', async () => {
    const malEscrito = await request(app).get('/api/constancias/abc')
    const inexistente = await request(app).get('/api/constancias/CO3-0000-0000')
    expect(malEscrito.status).toBe(404)
    expect(inexistente.status).toBe(404)
    expect(malEscrito.body).toEqual(inexistente.body)
  })

  it('muestra el nombre vigente de la persona', async () => {
    const { body } = await terminar(ana, await cursoPublicado('Acuerdos'))
    await prisma.usuario.update({ where: { idUsuario: ana.id }, data: { nombre: 'Ana María' } })
    try {
      const respuesta = await request(app)
        .get(`/api/constancias/${body.constanciasNuevas[0].folio}`)
        .expect(200)
      expect(respuesta.body.constancia.nombre).toBe('Ana María Prueba Constancias')
    } finally {
      await prisma.usuario.update({ where: { idUsuario: ana.id }, data: { nombre: 'Ana' } })
    }
  })
})

describe('cambios simultáneos sobre las rutas', () => {
  /** Lo que hace una marca que termina el curso, sin confirmar todavía: ya
   * escribió su finalización y tomó el candado de las rutas. */
  async function terminarSinConfirmar(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    quien: Persona,
    c: CursoDePrueba,
  ) {
    const [{ id_inscripcion: idInscripcion }] = await tx.$queryRaw<{ id_inscripcion: string }[]>`
      SELECT id_inscripcion FROM inscripciones_curso
      WHERE id_usuario = ${quien.id} AND id_curso = ${c.idCurso}
      FOR UPDATE`
    await tx.progresoLeccion.create({ data: { idInscripcion, idLeccion: c.lecciones[2] } })
    await tx.inscripcionCurso.update({
      where: { idInscripcion },
      data: { fechaFinalizacion: new Date() },
    })
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('constancias.rutas'))`
  }

  // Dos pestañas terminan a la vez los dos últimos cursos de una ruta. La
  // transacción de la prueba hace de la primera: ya terminó su curso pero no
  // confirma. Sin el candado, la segunda lee el otro curso sin terminar y no
  // emite la constancia de la ruta (y la primera tampoco, porque leyó el de la
  // segunda sin terminar): la ruta queda completa y sin constancia.
  it('terminar a la vez los dos últimos cursos de una ruta la emite', async () => {
    const a = await cursoPublicado('A')
    const b = await cursoPublicado('B')
    const idRuta = await rutaCon([a, b])
    for (const c of [a, b]) {
      await marcar(ana, c, c.lecciones[0]).expect(200)
      await marcar(ana, c, c.lecciones[1]).expect(200)
    }

    let segunda: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await terminarSinConfirmar(tx, ana, a)
      segunda = marcar(ana, b, b.lecciones[2]).then((r) => r)
      await esperar(300)
    })

    expect((await segunda)?.status).toBe(200)
    expect(await constanciaDeRuta(ana, idRuta)).toBeDefined()
  })

  // El administrador quita de la ruta el último curso que le faltaba a Ana
  // mientras ella termina el penúltimo. La transacción de la prueba hace de
  // Ana. Sin el candado, el administrador lee ese curso sin terminar, Ana lee
  // la lista vieja de la ruta, y nadie emite la constancia.
  it('quitar de la ruta un curso mientras alguien termina otro la emite', async () => {
    const [a, b, c] = [
      await cursoPublicado('A'),
      await cursoPublicado('B'),
      await cursoPublicado('C'),
    ]
    const idRuta = await rutaCon([a, b, c])
    await terminar(ana, a)
    await marcar(ana, b, b.lecciones[0]).expect(200)
    await marcar(ana, b, b.lecciones[1]).expect(200)

    let cambio: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await terminarSinConfirmar(tx, ana, b)
      cambio = como(admin)
        .put(`/api/admin/rutas/${idRuta}/cursos`, { cursos: [a.idCurso, b.idCurso] })
        .then((r) => r)
      await esperar(300)
    })

    expect((await cambio)?.status).toBe(200)
    expect(await constanciaDeRuta(ana, idRuta)).toBeDefined()
  })
})
