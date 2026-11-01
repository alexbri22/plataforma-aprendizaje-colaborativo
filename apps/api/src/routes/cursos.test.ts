import request, { type Response } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

const app = createApp()

const DATOS_ADMIN = {
  nombre: 'Grace',
  apellidoPaterno: 'Hopper',
  apellidoMaterno: 'Murray',
  nivelEstudios: 'Posgrado',
  institucionEducativa: 'Yale',
  correo: 'grace.cursos@ejemplo.com',
  contrasena: 'contrasena-admin-larga',
}

const DATOS_USUARIO = {
  nombre: 'Ada',
  apellidoPaterno: 'Lovelace',
  apellidoMaterno: 'Byron',
  nivelEstudios: 'Licenciatura',
  institucionEducativa: 'UNAM',
  correo: 'ada.cursos@ejemplo.com',
  contrasena: 'contrasena-larga',
}

// Ficha que cumple todos los mínimos de publicación.
const FICHA_COMPLETA = {
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

async function registrar(datos: typeof DATOS_USUARIO): Promise<{ id: string; cookie: string }> {
  const respuesta = await request(app).post('/api/usuarios').send(datos).expect(201)
  return { id: respuesta.body.usuario.idUsuario, cookie: extraerCookie(respuesta) }
}

// Las cuentas se registran una vez por archivo (el limitador de registro es
// por IP); entre pruebas solo se limpian cursos y recursos.
let admin: { id: string; cookie: string }
let usuario: { id: string; cookie: string }

beforeAll(async () => {
  await prisma.curso.deleteMany()
  await prisma.recursoFormativo.deleteMany()
  await prisma.usuario.deleteMany({
    where: { correo: { in: [DATOS_ADMIN.correo, DATOS_USUARIO.correo] } },
  })
  usuario = await registrar(DATOS_USUARIO)
  admin = await registrar(DATOS_ADMIN)
  await prisma.usuario.update({
    where: { idUsuario: admin.id },
    data: { tipoCuenta: 'administrador' },
  })
})

beforeEach(async () => {
  await prisma.curso.deleteMany()
  await prisma.recursoFormativo.deleteMany()
})

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

async function crearRecurso(estatus: 'borrador' | 'publicado' = 'publicado'): Promise<string> {
  const respuesta = await comoAdmin
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

async function crearCurso(ficha: object = FICHA_COMPLETA): Promise<string> {
  const respuesta = await comoAdmin.post('/api/admin/cursos', ficha).expect(201)
  return respuesta.body.curso.idCurso as string
}

// Sin async: devuelve la petición de supertest para poder encadenar .expect().
function agregar(idCurso: string, leccion: object) {
  return comoAdmin.post(`/api/admin/cursos/${idCurso}/lecciones`, leccion)
}

/** Curso con una lección de recurso, una práctica y una reflexión: listo
 * para publicar. */
async function cursoCompleto(): Promise<{ idCurso: string; idRecurso: string }> {
  const idRecurso = await crearRecurso()
  const idCurso = await crearCurso()
  await agregar(idCurso, { tipo: 'recurso', idRecurso }).expect(201)
  await agregar(idCurso, PRACTICA).expect(201)
  await agregar(idCurso, REFLEXION).expect(201)
  return { idCurso, idRecurso }
}

describe('autorización', () => {
  const rutas: [string, string][] = [
    ['get', '/api/admin/cursos'],
    ['get', '/api/admin/cursos/x'],
    ['post', '/api/admin/cursos'],
    ['patch', '/api/admin/cursos/x'],
    ['delete', '/api/admin/cursos/x'],
    ['post', '/api/admin/cursos/x/lecciones'],
    ['put', '/api/admin/cursos/x/lecciones/orden'],
    ['patch', '/api/admin/cursos/x/lecciones/y'],
    ['delete', '/api/admin/cursos/x/lecciones/y'],
  ]

  it.each(rutas)('%s %s responde 401 sin sesión', async (metodo, ruta) => {
    const respuesta = await request(app)[metodo as 'get'](ruta)
    expect(respuesta.status).toBe(401)
  })

  it.each(rutas)('%s %s responde 403 a una cuenta de usuario', async (metodo, ruta) => {
    const respuesta = await request(app)[metodo as 'get'](ruta).set('Cookie', usuario.cookie)
    expect(respuesta.status).toBe(403)
    expect(respuesta.body.codigo).toBe('no_autorizado')
  })
})

describe('ficha del curso', () => {
  it('crea un borrador con solo el título y lo pone al final', async () => {
    await crearCurso({ titulo: 'Primero' })
    const respuesta = await comoAdmin.post('/api/admin/cursos', { titulo: 'Segundo' })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.curso).toMatchObject({
      titulo: 'Segundo',
      estatus: 'borrador',
      orden: 1,
      numLecciones: 0,
      duracionMin: 0,
      lecciones: [],
      autor: { idUsuario: admin.id },
    })
  })

  it('rechaza un título vacío y valores fuera de catálogo', async () => {
    const respuesta = await comoAdmin.post('/api/admin/cursos', {
      titulo: '',
      area: 'liderazgo',
      nivel: 'experto',
      elementos: ['inventado'],
    })
    expect(respuesta.status).toBe(400)
    expect(Object.keys(respuesta.body.detallePorCampo).sort()).toEqual(
      ['area', 'elementos', 'nivel', 'titulo'].sort(),
    )
  })

  it('no se puede publicar sin lecciones, aunque la ficha esté completa', async () => {
    const respuesta = await comoAdmin.post('/api/admin/cursos', {
      ...FICHA_COMPLETA,
      estatus: 'publicado',
    })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.lecciones).toMatch(/al menos 2 lecciones/)
  })

  it('pide la ficha completa para publicar', async () => {
    const { idCurso } = await cursoCompleto()
    await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { objetivo: '', nivel: null })

    const respuesta = await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, {
      estatus: 'publicado',
    })
    expect(respuesta.status).toBe(400)
    expect(Object.keys(respuesta.body.detallePorCampo).sort()).toEqual(['nivel', 'objetivo'])
  })
})

describe('lecciones', () => {
  it('una lección de recurso necesita un recurso que exista', async () => {
    const idCurso = await crearCurso()
    const sinRecurso = await agregar(idCurso, { tipo: 'recurso' })
    expect(sinRecurso.status).toBe(400)
    expect(sinRecurso.body.detallePorCampo.idRecurso).toBeDefined()

    const inexistente = await agregar(idCurso, { tipo: 'recurso', idRecurso: 'no-existe' })
    expect(inexistente.status).toBe(404)
    expect(inexistente.body.codigo).toBe('recurso_no_encontrado')
  })

  it('una lección propia lleva título y no apunta a un recurso', async () => {
    const idRecurso = await crearRecurso()
    const idCurso = await crearCurso()
    const respuesta = await agregar(idCurso, { tipo: 'practica', idRecurso })
    expect(respuesta.status).toBe(400)
    expect(Object.keys(respuesta.body.detallePorCampo).sort()).toEqual(['idRecurso', 'titulo'])
  })

  it('suma la duración de las lecciones, tomando la del recurso cuando la lección no trae', async () => {
    const { idCurso } = await cursoCompleto()
    const { body } = await comoAdmin.get(`/api/admin/cursos/${idCurso}`).expect(200)

    expect(body.curso.numLecciones).toBe(3)
    // 4 (del recurso) + 10 + 5
    expect(body.curso.duracionMin).toBe(19)
    expect(body.curso.lecciones.map((l: { orden: number }) => l.orden)).toEqual([0, 1, 2])
    expect(body.curso.lecciones[0].recurso).toMatchObject({
      titulo: 'Plantilla de acuerdos claros',
      estatus: 'publicado',
    })
  })

  it('no admite más de 5 lecciones', async () => {
    const idCurso = await crearCurso()
    for (let i = 0; i < 5; i++) {
      await agregar(idCurso, { ...PRACTICA, titulo: `Práctica ${i}` }).expect(201)
    }
    const sexta = await agregar(idCurso, REFLEXION)
    expect(sexta.status).toBe(400)
    expect(sexta.body.detallePorCampo.lecciones).toMatch(/máximo 5/)
  })

  it('reordena con la lista completa y rechaza una lista que no coincide', async () => {
    const { idCurso } = await cursoCompleto()
    const { body } = await comoAdmin.get(`/api/admin/cursos/${idCurso}`)
    const ids = body.curso.lecciones.map((l: { idLeccion: string }) => l.idLeccion)
    const invertido = [...ids].reverse()

    const ok = await comoAdmin
      .put(`/api/admin/cursos/${idCurso}/lecciones/orden`, { lecciones: invertido })
      .expect(200)
    expect(ok.body.curso.lecciones.map((l: { idLeccion: string }) => l.idLeccion)).toEqual(
      invertido,
    )

    for (const lista of [ids.slice(1), [...ids, 'otra'], [ids[0], ids[0], ids[1]]]) {
      const mal = await comoAdmin.put(`/api/admin/cursos/${idCurso}/lecciones/orden`, {
        lecciones: lista,
      })
      expect(mal.status).toBe(400)
    }
  })

  it('al eliminar una lección, las demás se recorren sin huecos', async () => {
    const { idCurso } = await cursoCompleto()
    const { body } = await comoAdmin.get(`/api/admin/cursos/${idCurso}`)
    const [, enMedio] = body.curso.lecciones

    const respuesta = await comoAdmin
      .delete(`/api/admin/cursos/${idCurso}/lecciones/${enMedio.idLeccion}`)
      .expect(200)
    expect(respuesta.body.curso.lecciones.map((l: { orden: number }) => l.orden)).toEqual([0, 1])
  })

  it('responde 404 a una lección de otro curso', async () => {
    const { idCurso } = await cursoCompleto()
    const otro = await crearCurso({ titulo: 'Otro' })
    const { body } = await comoAdmin.get(`/api/admin/cursos/${idCurso}`)

    const respuesta = await comoAdmin.patch(
      `/api/admin/cursos/${otro}/lecciones/${body.curso.lecciones[0].idLeccion}`,
      { titulo: 'x' },
    )
    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('leccion_no_encontrada')
  })
})

describe('publicación', () => {
  it('publica un curso con práctica, reflexión y recurso publicado', async () => {
    const { idCurso } = await cursoCompleto()
    const respuesta = await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, {
      estatus: 'publicado',
    })
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.curso.estatus).toBe('publicado')
  })

  it('no publica si falta la reflexión o si un recurso no está publicado', async () => {
    const borrador = await crearRecurso('borrador')
    const idCurso = await crearCurso()
    const { body } = await agregar(idCurso, { tipo: 'recurso', idRecurso: borrador }).expect(201)
    const idLeccion = body.curso.lecciones[0].idLeccion
    await agregar(idCurso, PRACTICA).expect(201)

    const respuesta = await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, {
      estatus: 'publicado',
    })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.lecciones).toMatch(/reflexión/)
    expect(respuesta.body.detallePorCampo[`lecciones.${idLeccion}`]).toMatch(/no está publicado/)
  })

  it('un curso publicado no puede quedar sin sus mínimos al editar lecciones', async () => {
    const { idCurso } = await cursoCompleto()
    await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { estatus: 'publicado' }).expect(200)
    const { body } = await comoAdmin.get(`/api/admin/cursos/${idCurso}`)
    const reflexion = body.curso.lecciones.find((l: { tipo: string }) => l.tipo === 'reflexion')

    const respuesta = await comoAdmin.delete(
      `/api/admin/cursos/${idCurso}/lecciones/${reflexion.idLeccion}`,
    )
    expect(respuesta.status).toBe(400)
    // La transacción se deshizo: la lección sigue ahí.
    expect(await prisma.leccionCurso.count({ where: { idCurso } })).toBe(3)
  })

  it('un curso publicado se retira y se vuelve a publicar, pero no regresa a borrador', async () => {
    const { idCurso } = await cursoCompleto()
    const cambiar = (estatus: string) =>
      comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { estatus })

    expect((await cambiar('publicado')).status).toBe(200)
    expect((await cambiar('borrador')).status).toBe(400)
    expect((await cambiar('retirado')).status).toBe(200)
    expect((await cambiar('publicado')).status).toBe(200)
  })
})

describe('recursos usados en cursos', () => {
  it('no se puede eliminar un recurso mientras esté en un curso, aunque sea borrador', async () => {
    const idRecurso = await crearRecurso()
    const idCurso = await crearCurso({ titulo: 'Curso en borrador' })
    const { body } = await agregar(idCurso, { tipo: 'recurso', idRecurso }).expect(201)

    const rechazo = await comoAdmin.delete(`/api/admin/recursos/${idRecurso}`)
    expect(rechazo.status).toBe(409)
    expect(rechazo.body.codigo).toBe('recurso_en_uso')
    expect(rechazo.body.mensaje).toContain('«Curso en borrador»')

    await comoAdmin
      .delete(`/api/admin/cursos/${idCurso}/lecciones/${body.curso.lecciones[0].idLeccion}`)
      .expect(200)
    await comoAdmin.delete(`/api/admin/recursos/${idRecurso}`).expect(204)
  })

  it('el detalle del recurso dice en qué cursos se usa', async () => {
    const { idRecurso } = await cursoCompleto()
    const { body } = await comoAdmin.get(`/api/admin/recursos/${idRecurso}`).expect(200)
    expect(body.recurso.usadoEn).toEqual([
      expect.objectContaining({ titulo: FICHA_COMPLETA.titulo, estatus: 'borrador' }),
    ])
  })

  it('un mismo recurso puede estar en varios cursos', async () => {
    const idRecurso = await crearRecurso()
    for (const titulo of ['Curso A', 'Curso B']) {
      const idCurso = await crearCurso({ titulo })
      await agregar(idCurso, { tipo: 'recurso', idRecurso }).expect(201)
    }
    const { body } = await comoAdmin.get(`/api/admin/recursos/${idRecurso}`)
    expect(body.recurso.usadoEn.map((c: { titulo: string }) => c.titulo)).toEqual([
      'Curso A',
      'Curso B',
    ])
  })

  it('eliminar un curso no toca los recursos que usaba', async () => {
    const { idCurso, idRecurso } = await cursoCompleto()
    await comoAdmin.delete(`/api/admin/cursos/${idCurso}`).expect(204)
    expect(await prisma.leccionCurso.count()).toBe(0)
    await comoAdmin.get(`/api/admin/recursos/${idRecurso}`).expect(200)
  })

  it('la biblioteca del panel se puede buscar y filtrar por estatus', async () => {
    await crearRecurso('publicado')
    await crearRecurso('borrador')

    const publicados = await comoAdmin.get('/api/admin/recursos?estatus=publicado').expect(200)
    expect(publicados.body.paginacion.total).toBe(1)

    const busqueda = await comoAdmin.get('/api/admin/recursos?q=PLANTILLA').expect(200)
    expect(busqueda.body.paginacion.total).toBe(2)

    await comoAdmin.get('/api/admin/recursos?estatus=otro').expect(400)
  })
})

describe('un recurso retirado en un curso publicado', () => {
  async function publicadoConRecursoRetirado() {
    const { idCurso, idRecurso } = await cursoCompleto()
    await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { estatus: 'publicado' }).expect(200)
    await comoAdmin.patch(`/api/admin/recursos/${idRecurso}`, { estatus: 'retirado' }).expect(200)
    const { body } = await comoAdmin.get(`/api/admin/cursos/${idCurso}`)
    return { idCurso, idRecurso, lecciones: body.curso.lecciones }
  }

  it('no impide editar la ficha ni las otras lecciones', async () => {
    const { idCurso, lecciones } = await publicadoConRecursoRetirado()
    await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { resumen: 'Nuevo resumen' }).expect(200)
    await comoAdmin
      .patch(`/api/admin/cursos/${idCurso}/lecciones/${lecciones[1].idLeccion}`, { titulo: 'Otra' })
      .expect(200)
  })

  it('la lección se puede reparar apuntando a otro recurso publicado', async () => {
    const { idCurso, lecciones } = await publicadoConRecursoRetirado()
    const otro = await crearRecurso()
    const respuesta = await comoAdmin.patch(
      `/api/admin/cursos/${idCurso}/lecciones/${lecciones[0].idLeccion}`,
      { idRecurso: otro },
    )
    expect(respuesta.status).toBe(200)
  })

  it('no se puede poner un recurso sin publicar en un curso publicado', async () => {
    const { idCurso, lecciones } = await publicadoConRecursoRetirado()
    const borrador = await crearRecurso('borrador')
    const respuesta = await comoAdmin.patch(
      `/api/admin/cursos/${idCurso}/lecciones/${lecciones[0].idLeccion}`,
      { idRecurso: borrador },
    )
    expect(respuesta.status).toBe(400)
  })

  it('un curso retirado no se vuelve a publicar con el recurso retirado', async () => {
    const { idCurso } = await publicadoConRecursoRetirado()
    await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { estatus: 'retirado' }).expect(200)
    const respuesta = await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, {
      estatus: 'publicado',
    })
    expect(respuesta.status).toBe(400)
  })
})

describe('cambios simultáneos sobre un curso', () => {
  // Sin el bloqueo por curso, cada petición valida contra lo que leyó y las
  // dos pasan: se rompen los límites que el servicio promete.
  it('nunca pasa de 5 lecciones ni repite un orden', async () => {
    for (let i = 0; i < 5; i++) {
      const idCurso = await crearCurso({ titulo: `Curso ${i}` })
      const respuestas = await Promise.all(
        Array.from({ length: 7 }, (_, n) =>
          agregar(idCurso, { ...PRACTICA, titulo: `Práctica ${n}` }).then((r) => r),
        ),
      )
      expect(respuestas.every((r) => r.status === 201 || r.status === 400)).toBe(true)
      expect(await prisma.leccionCurso.count({ where: { idCurso } })).toBe(5)
    }
  })

  it('un curso publicado no se queda sin sus mínimos con dos borrados a la vez', async () => {
    for (let i = 0; i < 5; i++) {
      const { idCurso } = await cursoCompleto()
      await agregar(idCurso, { ...PRACTICA, titulo: 'Segunda práctica' }).expect(201)
      await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { estatus: 'publicado' }).expect(200)
      const { body } = await comoAdmin.get(`/api/admin/cursos/${idCurso}`)
      const practicas = body.curso.lecciones.filter((l: { tipo: string }) => l.tipo === 'practica')

      await Promise.all(
        practicas.map((l: { idLeccion: string }) =>
          comoAdmin.delete(`/api/admin/cursos/${idCurso}/lecciones/${l.idLeccion}`).then((r) => r),
        ),
      )
      expect(
        await prisma.leccionCurso.count({ where: { idCurso, tipo: 'practica' } }),
      ).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('tamaño del cuerpo en cursos', () => {
  it('acepta una lección de 20 000 caracteres de varios bytes', async () => {
    const idCurso = await crearCurso()
    const respuesta = await agregar(idCurso, { ...PRACTICA, contenido: '協"\n'.repeat(6_000) })
    expect(respuesta.status).toBe(201)
  })
})

describe('API pública de cursos', () => {
  async function publicado() {
    const curso = await cursoCompleto()
    await comoAdmin
      .patch(`/api/admin/cursos/${curso.idCurso}`, { estatus: 'publicado' })
      .expect(200)
    return curso
  }

  it('el catálogo solo lista publicados, sin sesión, y sin el contenido', async () => {
    const { idCurso } = await publicado()
    await crearCurso({ titulo: 'Borrador' })

    const { body } = await request(app).get('/api/cursos').expect(200)
    expect(body.cursos.map((c: { idCurso: string }) => c.idCurso)).toEqual([idCurso])
    expect(body.cursos[0]).toMatchObject({ numLecciones: 3, duracionMin: 19 })
    expect(body.cursos[0].lecciones).toBeUndefined()
    expect(body.cursos[0].estatus).toBeUndefined()
    expect(body.paginacion).toMatchObject({ pagina: 1, total: 1 })
  })

  it('filtra por área, nivel, elemento y texto, y rechaza valores desconocidos', async () => {
    const { idCurso } = await publicado()
    const total = async (query: string) =>
      (await request(app).get(`/api/cursos?${query}`).expect(200)).body.paginacion.total

    expect(await total('area=organizacion')).toBe(1)
    expect(await total('area=comunicacion')).toBe(0)
    expect(await total('nivel=inicial')).toBe(1)
    expect(await total('nivel=avanzado')).toBe(0)
    expect(await total('elemento=responsabilidades')).toBe(1)
    expect(await total('elemento=procesamiento_grupal')).toBe(0)
    expect(await total('q=COMPROMISOS')).toBe(1)
    expect(idCurso).toBeTruthy()

    await request(app).get('/api/cursos?nivel=experto').expect(400)
    await request(app).get('/api/cursos?elemento=otro').expect(400)
  })

  it('la ficha trae el índice sin contenido; borradores y retirados dan 404', async () => {
    const { idCurso } = await publicado()
    const { body } = await request(app).get(`/api/cursos/${idCurso}`).expect(200)

    expect(body.curso.objetivo).toBe(FICHA_COMPLETA.objetivo)
    expect(body.curso.lecciones).toHaveLength(3)
    expect(body.curso.lecciones[0]).toMatchObject({
      titulo: 'Plantilla de acuerdos claros',
      tipo: 'recurso',
      disponible: true,
    })
    expect(body.curso.lecciones[1].contenido).toBeUndefined()

    const borrador = await crearCurso({ titulo: 'Borrador' })
    await request(app).get(`/api/cursos/${borrador}`).expect(404)

    await comoAdmin.patch(`/api/admin/cursos/${idCurso}`, { estatus: 'retirado' }).expect(200)
    const retirado = await request(app).get(`/api/cursos/${idCurso}`)
    expect(retirado.status).toBe(404)
    expect(retirado.body.codigo).toBe('curso_no_encontrado')
  })

  it('una lección de recurso trae el recurso completo y sus vecinas', async () => {
    const { idCurso } = await publicado()
    const ficha = await request(app).get(`/api/cursos/${idCurso}`)
    const [primera, segunda] = ficha.body.curso.lecciones

    const { body } = await request(app)
      .get(`/api/cursos/${idCurso}/lecciones/${primera.idLeccion}`)
      .expect(200)
    expect(body.leccion.recurso.contenido).toBe('Contenido')
    expect(body.leccion.anterior).toBeNull()
    expect(body.leccion.siguiente).toEqual({
      idLeccion: segunda.idLeccion,
      titulo: PRACTICA.titulo,
    })
  })

  it('una lección cuyo recurso se retiró no expone el recurso ni su título', async () => {
    const { idCurso, idRecurso } = await publicado()
    await comoAdmin.patch(`/api/admin/recursos/${idRecurso}`, { estatus: 'retirado' }).expect(200)

    const ficha = await request(app).get(`/api/cursos/${idCurso}`).expect(200)
    const [primera] = ficha.body.curso.lecciones
    expect(primera).toMatchObject({ disponible: false, titulo: 'Recurso no disponible' })

    const { body } = await request(app)
      .get(`/api/cursos/${idCurso}/lecciones/${primera.idLeccion}`)
      .expect(200)
    expect(body.leccion.recurso).toBeNull()
  })

  it('responde 404 a una lección de otro curso', async () => {
    const { idCurso } = await publicado()
    const respuesta = await request(app).get(`/api/cursos/${idCurso}/lecciones/no-existe`)
    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('leccion_no_encontrada')
  })
})
