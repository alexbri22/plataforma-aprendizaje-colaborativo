import request, { type Response } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'
import { cursosCompletadosDe } from '../services/formacion/progreso.service.js'

const app = createApp()

function datosDe(nombre: string, correo: string) {
  return {
    nombre,
    apellidoPaterno: 'Prueba',
    apellidoMaterno: 'Progreso',
    nivelEstudios: 'Licenciatura',
    institucionEducativa: 'UNAM',
    correo,
    contrasena: 'contrasena-larga',
  }
}

const CORREOS = {
  admin: 'admin.progreso@ejemplo.com',
  ana: 'ana.progreso@ejemplo.com',
  beto: 'beto.progreso@ejemplo.com',
}

const FICHA = {
  titulo: 'Acuerdos y responsabilidades claras',
  resumen: 'Convierte una conversación en compromisos concretos.',
  objetivo: 'Redactar un acuerdo breve con compromisos observables.',
  area: 'organizacion',
  elementos: ['responsabilidades'],
  nivel: 'inicial',
  practicaFinal: 'Un acuerdo de equipo listo para usar.',
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
let ana: { id: string; cookie: string }
let beto: { id: string; cookie: string }

async function limpiar() {
  // Primero el progreso: la llave RESTRICT de inscripciones impide borrar
  // cursos que alguien empezó, y la de lecciones impide borrar recursos.
  await prisma.rutaFormativa.deleteMany()
  await prisma.inscripcionCurso.deleteMany()
  await prisma.recursoGuardado.deleteMany()
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
    delete: (ruta: string) => request(app).delete(ruta).set('Cookie', quien.cookie),
  }
}

async function crearRecurso(estatus: 'borrador' | 'publicado' = 'publicado'): Promise<string> {
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
      estatus,
    })
    .expect(201)
  return respuesta.body.recurso.idRecurso as string
}

interface CursoDePrueba {
  idCurso: string
  idRecurso: string
  /** En orden: recurso, práctica, reflexión. */
  lecciones: [string, string, string]
}

/** Curso publicado con una lección de recurso, una práctica y una
 * reflexión, todas obligatorias. */
async function cursoPublicado(titulo = FICHA.titulo): Promise<CursoDePrueba> {
  const idRecurso = await crearRecurso()
  const { body } = await como(admin)
    .post('/api/admin/cursos', { ...FICHA, titulo })
    .expect(201)
  const idCurso = body.curso.idCurso as string
  for (const leccion of [{ tipo: 'recurso', idRecurso }, PRACTICA, REFLEXION]) {
    await como(admin).post(`/api/admin/cursos/${idCurso}/lecciones`, leccion).expect(201)
  }
  const publicado = await como(admin)
    .patch(`/api/admin/cursos/${idCurso}`, { estatus: 'publicado' })
    .expect(200)
  const ids = publicado.body.curso.lecciones.map((l: { idLeccion: string }) => l.idLeccion)
  return { idCurso, idRecurso, lecciones: ids as [string, string, string] }
}

function marcar(quien: { cookie: string }, c: CursoDePrueba, idLeccion: string) {
  return como(quien).put(`/api/cursos/${c.idCurso}/lecciones/${idLeccion}/completada`)
}

function desmarcar(quien: { cookie: string }, c: CursoDePrueba, idLeccion: string) {
  return como(quien).delete(`/api/cursos/${c.idCurso}/lecciones/${idLeccion}/completada`)
}

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms))
}

async function miProgreso(quien: { cookie: string }, idCurso: string) {
  const { body } = await como(quien).get(`/api/me/cursos/${idCurso}`).expect(200)
  return body.progreso
}

describe('autorización', () => {
  const rutas: [string, string][] = [
    ['post', '/api/cursos/x/inscripcion'],
    ['put', '/api/cursos/x/lecciones/y/completada'],
    ['delete', '/api/cursos/x/lecciones/y/completada'],
    ['put', '/api/cursos/x/lecciones/y/reflexion'],
    ['get', '/api/me/formacion'],
    ['get', '/api/me/cursos/x'],
    ['get', '/api/me/recursos-guardados'],
    ['get', '/api/me/recursos-guardados/x'],
    ['put', '/api/me/recursos-guardados/x'],
    ['delete', '/api/me/recursos-guardados/x'],
  ]

  it.each(rutas)('%s %s responde 401 sin sesión', async (metodo, ruta) => {
    const respuesta = await request(app)[metodo as 'get'](ruta)
    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('sin_sesion')
  })

  it('leer un curso sigue siendo libre', async () => {
    const c = await cursoPublicado()
    await request(app).get(`/api/cursos/${c.idCurso}`).expect(200)
    await request(app).get(`/api/cursos/${c.idCurso}/lecciones/${c.lecciones[0]}`).expect(200)
  })
})

describe('inscripción', () => {
  it('se crea una vez y después se recupera', async () => {
    const c = await cursoPublicado()
    const primera = await como(ana).post(`/api/cursos/${c.idCurso}/inscripcion`)
    const segunda = await como(ana).post(`/api/cursos/${c.idCurso}/inscripcion`)

    expect(primera.status).toBe(201)
    expect(segunda.status).toBe(200)
    expect(segunda.body.progreso).toMatchObject({
      inscrito: true,
      fechaInicio: primera.body.progreso.fechaInicio,
      total: 3,
      completadas: 0,
      porcentaje: 0,
      siguiente: { idLeccion: c.lecciones[0] },
    })
    expect(await prisma.inscripcionCurso.count()).toBe(1)
  })

  it('dos inscripciones simultáneas dejan una sola fila', async () => {
    const c = await cursoPublicado()
    const respuestas = await Promise.all(
      Array.from({ length: 5 }, () =>
        como(ana)
          .post(`/api/cursos/${c.idCurso}/inscripcion`)
          .then((r) => r),
      ),
    )
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 200, 200, 200, 201])
    expect(await prisma.inscripcionCurso.count()).toBe(1)
  })

  it('leer mi progreso sin haber empezado responde en cero y no inscribe', async () => {
    const c = await cursoPublicado()
    expect(await miProgreso(ana, c.idCurso)).toMatchObject({
      inscrito: false,
      fechaInicio: null,
      leccionesCompletadas: [],
      porcentaje: 0,
    })
    expect(await prisma.inscripcionCurso.count()).toBe(0)
  })

  it('un borrador o un curso retirado no admite inscripción', async () => {
    const { body } = await como(admin).post('/api/admin/cursos', FICHA).expect(201)
    await como(ana).post(`/api/cursos/${body.curso.idCurso}/inscripcion`).expect(404)

    const c = await cursoPublicado('Otro')
    await como(admin).patch(`/api/admin/cursos/${c.idCurso}`, { estatus: 'retirado' }).expect(200)
    await como(ana).post(`/api/cursos/${c.idCurso}/inscripcion`).expect(404)
    await marcar(ana, c, c.lecciones[0]).expect(404)
    await como(ana).get(`/api/me/cursos/${c.idCurso}`).expect(404)
  })
})

describe('marcar lecciones', () => {
  it('marcar inscribe, es idempotente y avanza la siguiente', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[0]).expect(200)
    const respuesta = await marcar(ana, c, c.lecciones[0]).expect(200)

    expect(respuesta.body).toMatchObject({
      cursoCompletadoAhora: false,
      progreso: {
        inscrito: true,
        leccionesCompletadas: [c.lecciones[0]],
        completadas: 1,
        porcentaje: 33,
        siguiente: { idLeccion: c.lecciones[1], titulo: PRACTICA.titulo },
      },
    })
    expect(await prisma.progresoLeccion.count()).toBe(1)
  })

  it('completar todas fija la finalización una sola vez y desmarcar no la quita', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[0]).expect(200)
    await marcar(ana, c, c.lecciones[1]).expect(200)
    const ultima = await marcar(ana, c, c.lecciones[2]).expect(200)

    expect(ultima.body.cursoCompletadoAhora).toBe(true)
    const finalizacion = ultima.body.progreso.fechaFinalizacion as string
    expect(finalizacion).not.toBeNull()
    expect(ultima.body.progreso).toMatchObject({ porcentaje: 100, siguiente: null })

    const desmarcada = await desmarcar(ana, c, c.lecciones[1]).expect(200)
    expect(desmarcada.body).toMatchObject({
      cursoCompletadoAhora: false,
      progreso: { fechaFinalizacion: finalizacion, porcentaje: 66 },
    })
    const otraVez = await marcar(ana, c, c.lecciones[1]).expect(200)
    expect(otraVez.body.cursoCompletadoAhora).toBe(false)
    expect(otraVez.body.progreso.fechaFinalizacion).toBe(finalizacion)
  })

  it('una lección opcional no hace falta para terminar', async () => {
    const c = await cursoPublicado()
    await como(admin)
      .patch(`/api/admin/cursos/${c.idCurso}/lecciones/${c.lecciones[2]}`, { obligatoria: false })
      .expect(200)
    await marcar(ana, c, c.lecciones[0]).expect(200)
    const respuesta = await marcar(ana, c, c.lecciones[1]).expect(200)
    expect(respuesta.body.cursoCompletadoAhora).toBe(true)
    expect(respuesta.body.progreso).toMatchObject({
      total: 2,
      porcentaje: 100,
      siguiente: { idLeccion: c.lecciones[2] },
    })
  })

  it('una lección de otro curso responde 404', async () => {
    const c = await cursoPublicado('Uno')
    const otro = await cursoPublicado('Dos')
    await marcar(ana, c, otro.lecciones[0]).expect(404)
  })

  it('una lección con el recurso retirado no se puede completar', async () => {
    const c = await cursoPublicado()
    await como(admin)
      .patch(`/api/admin/recursos/${c.idRecurso}`, { estatus: 'retirado' })
      .expect(200)
    const respuesta = await marcar(ana, c, c.lecciones[0])
    expect(respuesta.status).toBe(409)
    expect(respuesta.body.codigo).toBe('leccion_no_disponible')
  })

  it('el progreso de una persona no se ve en el de otra', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[0]).expect(200)
    expect(await miProgreso(beto, c.idCurso)).toMatchObject({ inscrito: false, completadas: 0 })
  })

  it('terminar un curso no crea insignias ni otorgamientos', async () => {
    const antes = await prisma.insigniaOtorgada.count()
    const c = await cursoPublicado()
    for (const idLeccion of c.lecciones) await marcar(ana, c, idLeccion).expect(200)
    expect(await prisma.insigniaOtorgada.count()).toBe(antes)
    // Lo único que Formación ofrece a Insignias es esta lectura.
    expect(await cursosCompletadosDe(ana.id)).toEqual([
      expect.objectContaining({ idCurso: c.idCurso, titulo: FICHA.titulo }),
    ])
  })
})

describe('cambios del administrador sobre un curso empezado', () => {
  it('una lección nueva baja el porcentaje pero no quita la finalización', async () => {
    const c = await cursoPublicado()
    for (const idLeccion of c.lecciones) await marcar(ana, c, idLeccion).expect(200)
    await como(admin)
      .post(`/api/admin/cursos/${c.idCurso}/lecciones`, { ...PRACTICA, titulo: 'Nueva' })
      .expect(201)

    const progreso = await miProgreso(ana, c.idCurso)
    expect(progreso.fechaFinalizacion).not.toBeNull()
    expect(progreso).toMatchObject({ total: 4, completadas: 3, porcentaje: 75 })
    expect(progreso.siguiente.titulo).toBe('Nueva')
  })

  it('quitar la única lección pendiente termina el curso', async () => {
    const c = await cursoPublicado()
    await como(admin)
      .post(`/api/admin/cursos/${c.idCurso}/lecciones`, { ...PRACTICA, titulo: 'Extra' })
      .expect(201)
    for (const idLeccion of c.lecciones) await marcar(ana, c, idLeccion).expect(200)
    expect((await miProgreso(ana, c.idCurso)).fechaFinalizacion).toBeNull()

    const { body } = await como(admin).get(`/api/admin/cursos/${c.idCurso}`)
    const extra = body.curso.lecciones.find((l: { titulo: string }) => l.titulo === 'Extra')
    await como(admin)
      .delete(`/api/admin/cursos/${c.idCurso}/lecciones/${extra.idLeccion}`)
      .expect(200)

    expect((await miProgreso(ana, c.idCurso)).fechaFinalizacion).not.toBeNull()
  })

  it('volver opcional la lección pendiente termina el curso', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[0]).expect(200)
    await marcar(ana, c, c.lecciones[1]).expect(200)
    await como(admin)
      .patch(`/api/admin/cursos/${c.idCurso}/lecciones/${c.lecciones[2]}`, { obligatoria: false })
      .expect(200)
    expect((await miProgreso(ana, c.idCurso)).fechaFinalizacion).not.toBeNull()
  })

  it('retirar el recurso de la lección pendiente termina el curso', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[1]).expect(200)
    await marcar(ana, c, c.lecciones[2]).expect(200)
    await como(admin)
      .patch(`/api/admin/recursos/${c.idRecurso}`, { estatus: 'retirado' })
      .expect(200)

    const progreso = await miProgreso(ana, c.idCurso)
    expect(progreso.fechaFinalizacion).not.toBeNull()
    expect(progreso).toMatchObject({ total: 2, porcentaje: 100, siguiente: null })
  })

  it('cambiar el recurso o reordenar conserva el progreso', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[0]).expect(200)
    const otroRecurso = await crearRecurso()
    await como(admin)
      .patch(`/api/admin/cursos/${c.idCurso}/lecciones/${c.lecciones[0]}`, {
        idRecurso: otroRecurso,
      })
      .expect(200)
    await como(admin)
      .put(`/api/admin/cursos/${c.idCurso}/lecciones/orden`, {
        lecciones: [c.lecciones[2], c.lecciones[0], c.lecciones[1]],
      })
      .expect(200)

    const progreso = await miProgreso(ana, c.idCurso)
    expect(progreso.leccionesCompletadas).toEqual([c.lecciones[0]])
    expect(progreso.siguiente.idLeccion).toBe(c.lecciones[2])
  })

  it('un curso que alguien empezó no se elimina; uno sin inscripciones sí', async () => {
    const c = await cursoPublicado()
    await como(ana).post(`/api/cursos/${c.idCurso}/inscripcion`).expect(201)
    const respuesta = await como(admin).delete(`/api/admin/cursos/${c.idCurso}`)
    expect(respuesta.status).toBe(409)
    expect(respuesta.body.codigo).toBe('curso_con_inscripciones')

    const libre = await cursoPublicado('Sin alumnos')
    await como(admin).delete(`/api/admin/cursos/${libre.idCurso}`).expect(204)
  })
})

describe('reflexión', () => {
  const ruta = (c: CursoDePrueba, idLeccion = c.lecciones[2]) =>
    `/api/cursos/${c.idCurso}/lecciones/${idLeccion}/reflexion`

  it('se guarda, se actualiza y un texto vacío la borra, sin marcar la lección', async () => {
    const c = await cursoPublicado()
    const primera = await como(ana)
      .put(ruta(c), { texto: '  Pediré fechas concretas.  ' })
      .expect(200)
    expect(primera.body.reflexion).toMatchObject({
      idLeccion: c.lecciones[2],
      texto: 'Pediré fechas concretas.',
    })
    await como(ana).put(ruta(c), { texto: 'Pediré fechas y responsables.' }).expect(200)

    let progreso = await miProgreso(ana, c.idCurso)
    expect(progreso).toMatchObject({ inscrito: true, leccionesCompletadas: [] })
    expect(progreso.reflexiones).toEqual([
      expect.objectContaining({
        idLeccion: c.lecciones[2],
        texto: 'Pediré fechas y responsables.',
      }),
    ])

    const vacia = await como(ana).put(ruta(c), { texto: '   ' }).expect(200)
    expect(vacia.body.reflexion).toBeNull()
    progreso = await miProgreso(ana, c.idCurso)
    expect(progreso.reflexiones).toEqual([])
  })

  it('es privada: otra persona no la ve', async () => {
    const c = await cursoPublicado()
    await como(ana).put(ruta(c), { texto: 'Solo para mí.' }).expect(200)
    expect((await miProgreso(beto, c.idCurso)).reflexiones).toEqual([])
    // Y el contenido público de la lección no la incluye.
    const publica = await request(app).get(`/api/cursos/${c.idCurso}/lecciones/${c.lecciones[2]}`)
    expect(JSON.stringify(publica.body)).not.toContain('Solo para mí.')
  })

  it('solo las lecciones de reflexión guardan respuesta', async () => {
    const c = await cursoPublicado()
    const respuesta = await como(ana).put(ruta(c, c.lecciones[1]), { texto: 'Hola' })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.codigo).toBe('validacion')
  })

  it('rechaza un texto demasiado largo o que no sea texto', async () => {
    const c = await cursoPublicado()
    await como(ana)
      .put(ruta(c), { texto: 'a'.repeat(5_001) })
      .expect(400)
    await como(ana).put(ruta(c), { texto: 42 }).expect(400)
    await como(ana).put(ruta(c), {}).expect(400)
  })
})

describe('mis cursos', () => {
  it('separa en curso y terminados, el más reciente primero', async () => {
    const primero = await cursoPublicado('Primero')
    const segundo = await cursoPublicado('Segundo')
    const terminado = await cursoPublicado('Terminado')
    await marcar(ana, primero, primero.lecciones[0]).expect(200)
    await como(ana).post(`/api/cursos/${segundo.idCurso}/inscripcion`).expect(201)
    for (const idLeccion of terminado.lecciones) await marcar(ana, terminado, idLeccion).expect(200)

    const { body } = await como(ana).get('/api/me/formacion').expect(200)
    expect(body.enCurso.map((c: { titulo: string }) => c.titulo)).toEqual(['Segundo', 'Primero'])
    expect(body.enCurso[1]).toMatchObject({
      estatus: 'publicado',
      completadas: 1,
      total: 3,
      porcentaje: 33,
      siguiente: { idLeccion: primero.lecciones[1] },
    })
    expect(body.completados).toEqual([
      expect.objectContaining({ titulo: 'Terminado', porcentaje: 100, siguiente: null }),
    ])

    const deBeto = await como(beto).get('/api/me/formacion').expect(200)
    expect(deBeto.body).toEqual({ enCurso: [], completados: [] })
  })

  it('un curso retirado sigue en la lista, sin siguiente lección', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[0]).expect(200)
    await como(admin).patch(`/api/admin/cursos/${c.idCurso}`, { estatus: 'retirado' }).expect(200)

    const { body } = await como(ana).get('/api/me/formacion').expect(200)
    expect(body.enCurso).toEqual([
      expect.objectContaining({ idCurso: c.idCurso, estatus: 'retirado', siguiente: null }),
    ])
  })
})

describe('recursos guardados', () => {
  it('guardar es idempotente, no inscribe y se puede quitar', async () => {
    const idRecurso = await crearRecurso()
    await como(ana).put(`/api/me/recursos-guardados/${idRecurso}`).expect(204)
    await como(ana).put(`/api/me/recursos-guardados/${idRecurso}`).expect(204)

    const estado = await como(ana).get(`/api/me/recursos-guardados/${idRecurso}`).expect(200)
    expect(estado.body).toEqual({ guardado: true })
    const lista = await como(ana).get('/api/me/recursos-guardados').expect(200)
    expect(lista.body.recursos.map((r: { idRecurso: string }) => r.idRecurso)).toEqual([idRecurso])
    expect(lista.body.paginacion).toMatchObject({ pagina: 1, total: 1 })
    expect(await prisma.inscripcionCurso.count()).toBe(0)

    await como(ana).delete(`/api/me/recursos-guardados/${idRecurso}`).expect(204)
    await como(ana).delete(`/api/me/recursos-guardados/${idRecurso}`).expect(204)
    const despues = await como(ana).get(`/api/me/recursos-guardados/${idRecurso}`).expect(200)
    expect(despues.body).toEqual({ guardado: false })
  })

  it('un borrador no se puede guardar', async () => {
    const idRecurso = await crearRecurso('borrador')
    await como(ana).put(`/api/me/recursos-guardados/${idRecurso}`).expect(404)
  })

  it('un recurso retirado se oculta de la lista y vuelve si se publica', async () => {
    const idRecurso = await crearRecurso()
    await como(ana).put(`/api/me/recursos-guardados/${idRecurso}`).expect(204)
    await como(admin).patch(`/api/admin/recursos/${idRecurso}`, { estatus: 'retirado' }).expect(200)
    let lista = await como(ana).get('/api/me/recursos-guardados').expect(200)
    expect(lista.body.paginacion.total).toBe(0)

    await como(admin)
      .patch(`/api/admin/recursos/${idRecurso}`, { estatus: 'publicado' })
      .expect(200)
    lista = await como(ana).get('/api/me/recursos-guardados').expect(200)
    expect(lista.body.paginacion.total).toBe(1)
  })

  it('cada persona ve solo los suyos', async () => {
    const idRecurso = await crearRecurso()
    await como(ana).put(`/api/me/recursos-guardados/${idRecurso}`).expect(204)
    const lista = await como(beto).get('/api/me/recursos-guardados').expect(200)
    expect(lista.body.paginacion.total).toBe(0)
  })
})

describe('cambios simultáneos sobre el progreso', () => {
  // Sin el bloqueo de la inscripción, cada petición marca su lección, lee el
  // progreso sin ver la de la otra (aún no confirmada) y ninguna fija la
  // finalización: el curso queda con todo hecho pero sin terminar.
  it('marcar a la vez las últimas lecciones termina el curso', async () => {
    for (let i = 0; i < 5; i++) {
      const c = await cursoPublicado(`Curso ${i}`)
      await marcar(ana, c, c.lecciones[0]).expect(200)
      const respuestas = await Promise.all([
        marcar(ana, c, c.lecciones[1]).then((r) => r),
        marcar(ana, c, c.lecciones[2]).then((r) => r),
      ])
      expect(respuestas.map((r) => r.status)).toEqual([200, 200])
      expect(respuestas.filter((r) => r.body.cursoCompletadoAhora)).toHaveLength(1)
      expect((await miProgreso(ana, c.idCurso)).fechaFinalizacion).not.toBeNull()
    }
  })

  // El administrador quita la lección pendiente mientras la persona marca la
  // otra: si nada los ordena, cada lado cree que falta algo. Aquí los ordenan
  // dos bloqueos a la vez (el del curso y el del recálculo); las dos pruebas
  // siguientes aíslan cada uno.
  it('quitar una lección mientras alguien marca la otra termina el curso', async () => {
    for (let i = 0; i < 5; i++) {
      const c = await cursoPublicado(`Curso ${i}`)
      await como(admin)
        .post(`/api/admin/cursos/${c.idCurso}/lecciones`, { ...PRACTICA, titulo: 'Extra' })
        .expect(201)
      const { body } = await como(admin).get(`/api/admin/cursos/${c.idCurso}`)
      const extra = body.curso.lecciones.find((l: { titulo: string }) => l.titulo === 'Extra')
      await marcar(ana, c, c.lecciones[0]).expect(200)
      await marcar(ana, c, c.lecciones[1]).expect(200)

      await Promise.all([
        marcar(ana, c, c.lecciones[2]).then((r) => r),
        como(admin)
          .delete(`/api/admin/cursos/${c.idCurso}/lecciones/${extra.idLeccion}`)
          .then((r) => r),
      ])
      expect((await miProgreso(ana, c.idCurso)).fechaFinalizacion).not.toBeNull()
    }
  })

  // Retirar un recurso no bloquea el curso: lo único que evita el choque es
  // que el recálculo bloquee las inscripciones antes de leer el progreso. La
  // transacción de la prueba hace de una marca a medio camino: ya leyó las
  // lecciones (con el recurso publicado, así que no termina el curso) y
  // guardó su lección, pero aún no confirma. Sin el bloqueo, el retiro lee el
  // progreso sin esa lección y nadie fija la finalización.
  it('retirar el recurso pendiente mientras alguien marca la otra termina el curso', async () => {
    const c = await cursoPublicado()
    await marcar(ana, c, c.lecciones[1]).expect(200)

    let retiro: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      const [{ id_inscripcion: idInscripcion }] = await tx.$queryRaw<{ id_inscripcion: string }[]>`
        SELECT id_inscripcion FROM inscripciones_curso
        WHERE id_usuario = ${ana.id} AND id_curso = ${c.idCurso}
        FOR UPDATE`
      await tx.progresoLeccion.create({ data: { idInscripcion, idLeccion: c.lecciones[2] } })
      retiro = como(admin)
        .patch(`/api/admin/recursos/${c.idRecurso}`, { estatus: 'retirado' })
        .then((r) => r)
      await esperar(300)
    })

    expect((await retiro)?.status).toBe(200)
    expect((await miProgreso(ana, c.idCurso)).fechaFinalizacion).not.toBeNull()
  })

  // La transacción de la prueba hace de un administrador que está borrando
  // una lección. Sin el bloqueo compartido del curso, la marca lee la lección
  // (el borrado no se ha confirmado), choca con su llave foránea y responde
  // 500; con él, espera y responde 404.
  it('marcar una lección que el administrador está borrando responde 404', async () => {
    const c = await cursoPublicado()
    await como(admin)
      .post(`/api/admin/cursos/${c.idCurso}/lecciones`, { ...PRACTICA, titulo: 'Extra' })
      .expect(201)
    const { body } = await como(admin).get(`/api/admin/cursos/${c.idCurso}`)
    const extra = body.curso.lecciones.find((l: { titulo: string }) => l.titulo === 'Extra')
    await como(ana).post(`/api/cursos/${c.idCurso}/inscripcion`).expect(201)

    let marca: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_curso FROM cursos WHERE id_curso = ${c.idCurso} FOR UPDATE`
      await tx.leccionCurso.delete({ where: { idLeccion: extra.idLeccion } })
      marca = marcar(ana, c, extra.idLeccion).then((r) => r)
      await esperar(300)
    })

    expect((await marca)?.status).toBe(404)
  })

  // La transacción de la prueba hace de un administrador que está retirando
  // el recurso de una lección (aún no confirma). A la vez, la persona marca
  // su PRIMERA lección: su inscripción todavía no existe, así que el recálculo
  // del retiro no puede verla. Sin el bloqueo compartido de los recursos del
  // curso, la marca lee el recurso como publicado, no da el curso por
  // terminado, y nadie fija la finalización.
  it('retirar un recurso mientras alguien hace su primera marca termina el curso', async () => {
    const c = await cursoPublicado()
    // La reflexión opcional: con el recurso retirado, solo cuenta la práctica.
    await como(admin)
      .patch(`/api/admin/cursos/${c.idCurso}/lecciones/${c.lecciones[2]}`, { obligatoria: false })
      .expect(200)

    let marca: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id_recurso FROM recursos_formativos WHERE id_recurso = ${c.idRecurso} FOR UPDATE`
      await tx.recursoFormativo.update({
        where: { idRecurso: c.idRecurso },
        data: { estatus: 'retirado' },
      })
      marca = marcar(ana, c, c.lecciones[1]).then((r) => r)
      await esperar(300)
    })

    expect((await marca)?.status).toBe(200)
    expect((await marca)?.body.cursoCompletadoAhora).toBe(true)
    expect((await miProgreso(ana, c.idCurso)).fechaFinalizacion).not.toBeNull()
  })
})
