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

// Un artículo que cumple todos los mínimos de publicación.
const ARTICULO_COMPLETO = {
  seccion: 'como_colaborar',
  titulo: 'Acuerdos que se recuerdan',
  resumen: 'Qué anotar después de una reunión.',
  tipoRecurso: 'texto',
  contenido: '## Idea\n\nAnota quién, qué y cuándo.',
  area: 'organizacion',
  elementos: ['responsabilidades'],
  duracionMin: 4,
  fuente: 'Equipo Co3',
  licencia: 'CC BY 4.0',
}

const PDF_MINIMO = Buffer.from('%PDF-1.4\n%%EOF\n', 'ascii')

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

async function registrarAdministrador(): Promise<{ id: string; cookie: string }> {
  const admin = await registrar(DATOS_ADMIN)
  await prisma.usuario.update({
    where: { idUsuario: admin.id },
    data: { tipoCuenta: 'administrador' },
  })
  return admin
}

async function crear(cookie: string, datos: object): Promise<string> {
  const respuesta = await request(app)
    .post('/api/admin/recursos')
    .set('Cookie', cookie)
    .send(datos)
    .expect(201)
  return respuesta.body.recurso.idRecurso as string
}

// Las cuentas se registran una sola vez por archivo: el limitador de registro
// es por IP y todas las peticiones de prueba salen de la misma. Entre pruebas
// solo se limpian los recursos.
let admin: { id: string; cookie: string }
let usuario: { id: string; cookie: string }

beforeAll(async () => {
  await prisma.recursoFormativo.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
  usuario = await registrar(DATOS_USUARIO)
  admin = await registrarAdministrador()
})

beforeEach(async () => {
  await prisma.recursoFormativo.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('rutas administrativas de recursos', () => {
  const rutas: [string, string][] = [
    ['get', '/api/admin/recursos'],
    ['get', '/api/admin/recursos/x'],
    ['post', '/api/admin/recursos'],
    ['patch', '/api/admin/recursos/x'],
    ['delete', '/api/admin/recursos/x'],
    ['put', '/api/admin/recursos/x/archivo'],
    ['delete', '/api/admin/recursos/x/archivo'],
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

describe('POST /api/admin/recursos', () => {
  it('crea un borrador con lo mínimo y lo pone al final de la lista', async () => {
    await crear(admin.cookie, { seccion: 'que_es_colaborar', titulo: 'Uno', tipoRecurso: 'texto' })
    const respuesta = await request(app)
      .post('/api/admin/recursos')
      .set('Cookie', admin.cookie)
      .send({ seccion: 'que_es_colaborar', titulo: 'Dos', tipoRecurso: 'enlace' })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.recurso).toMatchObject({
      titulo: 'Dos',
      estatus: 'borrador',
      orden: 1,
      autor: { idUsuario: admin.id },
    })
  })

  it('rechaza sección, tipo, área o elementos fuera del catálogo', async () => {
    const respuesta = await request(app)
      .post('/api/admin/recursos')
      .set('Cookie', admin.cookie)
      .send({
        seccion: 'otra',
        titulo: '',
        tipoRecurso: 'ejecutable',
        area: 'liderazgo',
        elementos: ['inventado'],
      })

    expect(respuesta.status).toBe(400)
    expect(Object.keys(respuesta.body.detallePorCampo).sort()).toEqual(
      ['area', 'elementos', 'seccion', 'tipoRecurso', 'titulo'].sort(),
    )
  })

  it('no acepta un enlace que no sea https', async () => {
    for (const contenido of ['http://ejemplo.com', 'javascript:alert(1)']) {
      const respuesta = await request(app)
        .post('/api/admin/recursos')
        .set('Cookie', admin.cookie)
        .send({ seccion: 'como_colaborar', titulo: 'Enlace', tipoRecurso: 'enlace', contenido })
      expect(respuesta.status).toBe(400)
      expect(respuesta.body.detallePorCampo.contenido).toBeDefined()
    }
  })

  it('no publica si faltan los mínimos, y sí cuando están completos', async () => {
    const incompleto = await request(app)
      .post('/api/admin/recursos')
      .set('Cookie', admin.cookie)
      .send({ seccion: 'como_colaborar', titulo: 'X', tipoRecurso: 'texto', estatus: 'publicado' })
    expect(incompleto.status).toBe(400)
    expect(Object.keys(incompleto.body.detallePorCampo)).toEqual(
      expect.arrayContaining(['resumen', 'area', 'elementos', 'fuente', 'licencia', 'contenido']),
    )

    const completo = await request(app)
      .post('/api/admin/recursos')
      .set('Cookie', admin.cookie)
      .send({ ...ARTICULO_COMPLETO, estatus: 'publicado' })
    expect(completo.status).toBe(201)
    expect(completo.body.recurso.estatus).toBe('publicado')
  })

  it('exige transcripción para publicar un video', async () => {
    const respuesta = await request(app)
      .post('/api/admin/recursos')
      .set('Cookie', admin.cookie)
      .send({
        ...ARTICULO_COMPLETO,
        tipoRecurso: 'video',
        contenido: 'https://www.youtube.com/watch?v=abc',
        estatus: 'publicado',
      })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.transcripcion).toBeDefined()
  })
})

describe('catálogo público', () => {
  it('solo lista y muestra lo publicado, sin sesión', async () => {
    const publicado = await crear(admin.cookie, { ...ARTICULO_COMPLETO, estatus: 'publicado' })
    const borrador = await crear(admin.cookie, { ...ARTICULO_COMPLETO, titulo: 'Borrador' })
    const retirado = await crear(admin.cookie, { ...ARTICULO_COMPLETO, estatus: 'publicado' })
    await request(app)
      .patch(`/api/admin/recursos/${retirado}`)
      .set('Cookie', admin.cookie)
      .send({ estatus: 'retirado' })
      .expect(200)

    const lista = await request(app).get('/api/recursos')
    expect(lista.status).toBe(200)
    expect(lista.body.recursos.map((r: { idRecurso: string }) => r.idRecurso)).toEqual([publicado])
    // El listado no trae el cuerpo ni el estatus.
    expect(lista.body.recursos[0].contenido).toBeUndefined()
    expect(lista.body.recursos[0].estatus).toBeUndefined()

    const detalle = await request(app).get(`/api/recursos/${publicado}`)
    expect(detalle.status).toBe(200)
    expect(detalle.body.recurso.contenido).toBe(ARTICULO_COMPLETO.contenido)

    for (const id of [borrador, retirado, 'no-existe']) {
      const respuesta = await request(app).get(`/api/recursos/${id}`)
      expect(respuesta.status).toBe(404)
      expect(respuesta.body.codigo).toBe('recurso_no_encontrado')
    }
  })

  it('filtra por sección, área, tipo y texto', async () => {
    await crear(admin.cookie, { ...ARTICULO_COMPLETO, estatus: 'publicado' })
    const otro = await crear(admin.cookie, {
      ...ARTICULO_COMPLETO,
      seccion: 'que_es_colaborar',
      titulo: 'Escucha activa',
      area: 'comunicacion',
      estatus: 'publicado',
    })

    const ids = async (query: string) =>
      (await request(app).get(`/api/recursos?${query}`).expect(200)).body.recursos.map(
        (r: { idRecurso: string }) => r.idRecurso,
      )

    expect(await ids('seccion=que_es_colaborar')).toEqual([otro])
    expect(await ids('area=comunicacion')).toEqual([otro])
    expect(await ids('q=ESCUCHA')).toEqual([otro])
    // Sin acentos ni mayúsculas, y también por el área.
    expect(await ids('q=comunicacion')).toEqual([otro])
    expect(await ids(`q=${encodeURIComponent('ÉSCUCHÁ')}`)).toEqual([otro])
    expect(await ids('tipo=pdf')).toEqual([])
    expect((await ids('tipo=pdf,texto')).length).toBe(2)

    for (const query of ['area=liderazgo', 'tipo=texto,ejecutable']) {
      const invalido = await request(app).get(`/api/recursos?${query}`)
      expect(invalido.status).toBe(400)
    }
  })
})

describe('paginación', () => {
  async function publicarVarios(n: number): Promise<string[]> {
    const ids: string[] = []
    for (let i = 0; i < n; i++) {
      ids.push(
        await crear(admin.cookie, {
          ...ARTICULO_COMPLETO,
          titulo: `Recurso ${i}`,
          orden: i,
          estatus: 'publicado',
        }),
      )
    }
    return ids
  }

  it('el catálogo público reparte los recursos en páginas sin repetir ni saltar', async () => {
    const ids = await publicarVarios(5)
    await crear(admin.cookie, { ...ARTICULO_COMPLETO, titulo: 'Borrador' })

    const pagina = async (n: number) =>
      (await request(app).get(`/api/recursos?porPagina=2&pagina=${n}`).expect(200)).body

    const primera = await pagina(1)
    // El borrador no cuenta en el total público.
    expect(primera.paginacion).toEqual({ pagina: 1, porPagina: 2, total: 5, totalPaginas: 3 })

    const vistos = [
      ...primera.recursos,
      ...(await pagina(2)).recursos,
      ...(await pagina(3)).recursos,
    ].map((r: { idRecurso: string }) => r.idRecurso)
    expect(vistos).toEqual(ids)

    // Pasada la última página: lista vacía, no error.
    const despues = await pagina(4)
    expect(despues.recursos).toEqual([])
    expect(despues.paginacion.total).toBe(5)
  })

  it('el panel pagina todos los estatus', async () => {
    await publicarVarios(3)
    await crear(admin.cookie, { ...ARTICULO_COMPLETO, titulo: 'Borrador' })

    const respuesta = await request(app)
      .get('/api/admin/recursos?porPagina=3&pagina=2')
      .set('Cookie', admin.cookie)
      .expect(200)
    expect(respuesta.body.paginacion).toEqual({
      pagina: 2,
      porPagina: 3,
      total: 4,
      totalPaginas: 2,
    })
    expect(respuesta.body.recursos).toHaveLength(1)
  })

  it('rechaza una página o un tamaño inválidos', async () => {
    for (const query of ['pagina=0', 'pagina=dos', 'porPagina=0', 'porPagina=51', 'pagina=1.5']) {
      const respuesta = await request(app).get(`/api/recursos?${query}`)
      expect(respuesta.status).toBe(400)
    }
  })
})

describe('PATCH /api/admin/recursos/:id', () => {
  it('al editar, la búsqueda encuentra el título nuevo y no el anterior', async () => {
    const id = await crear(admin.cookie, { ...ARTICULO_COMPLETO, estatus: 'publicado' })
    await request(app)
      .patch(`/api/admin/recursos/${id}`)
      .set('Cookie', admin.cookie)
      .send({ titulo: 'Reuniones eficaces' })
      .expect(200)

    const buscar = async (q: string) =>
      (await request(app).get(`/api/recursos?q=${q}`).expect(200)).body.recursos.length
    expect(await buscar('eficaces')).toBe(1)
    expect(await buscar('recuerdan')).toBe(0)
  })

  it('un recurso publicado no vuelve a borrador, pero se puede retirar y republicar', async () => {
    const id = await crear(admin.cookie, { ...ARTICULO_COMPLETO, estatus: 'publicado' })
    const patch = (estatus: string) =>
      request(app).patch(`/api/admin/recursos/${id}`).set('Cookie', admin.cookie).send({ estatus })

    expect((await patch('borrador')).status).toBe(400)
    expect((await patch('retirado')).status).toBe(200)
    expect((await patch('publicado')).status).toBe(200)
  })

  it('no permite dejar un recurso publicado sin sus mínimos', async () => {
    const id = await crear(admin.cookie, { ...ARTICULO_COMPLETO, estatus: 'publicado' })
    const respuesta = await request(app)
      .patch(`/api/admin/recursos/${id}`)
      .set('Cookie', admin.cookie)
      .send({ licencia: '' })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.licencia).toBeDefined()
  })
})

describe('DELETE /api/admin/recursos/:id', () => {
  it('elimina un recurso en cualquier estatus y deja de verse', async () => {
    const borrador = await crear(admin.cookie, ARTICULO_COMPLETO)
    const publicado = await crear(admin.cookie, { ...ARTICULO_COMPLETO, estatus: 'publicado' })

    for (const id of [borrador, publicado]) {
      await request(app).delete(`/api/admin/recursos/${id}`).set('Cookie', admin.cookie).expect(204)
    }
    expect(await prisma.recursoFormativo.count()).toBe(0)
    await request(app).get(`/api/recursos/${publicado}`).expect(404)
  })

  it('borra también el archivo del recurso', async () => {
    const id = await crear(admin.cookie, {
      ...ARTICULO_COMPLETO,
      tipoRecurso: 'pdf',
      contenido: '',
    })
    await request(app)
      .put(`/api/admin/recursos/${id}/archivo`)
      .set('Cookie', admin.cookie)
      .set('Content-Type', 'application/pdf')
      .send(PDF_MINIMO)
      .expect(200)

    await request(app).delete(`/api/admin/recursos/${id}`).set('Cookie', admin.cookie).expect(204)
    expect(await prisma.archivoRecurso.count()).toBe(0)
  })

  it('responde 404 si el recurso no existe', async () => {
    const respuesta = await request(app)
      .delete('/api/admin/recursos/no-existe')
      .set('Cookie', admin.cookie)
    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('recurso_no_encontrado')
  })
})

describe('archivo de un recurso', () => {
  it('sube un PDF, permite publicarlo y lo sirve al público', async () => {
    const id = await crear(admin.cookie, {
      ...ARTICULO_COMPLETO,
      tipoRecurso: 'pdf',
      contenido: '',
    })

    const sinArchivo = await request(app)
      .patch(`/api/admin/recursos/${id}`)
      .set('Cookie', admin.cookie)
      .send({ estatus: 'publicado' })
    expect(sinArchivo.status).toBe(400)
    expect(sinArchivo.body.detallePorCampo.archivo).toBeDefined()

    const subida = await request(app)
      .put(`/api/admin/recursos/${id}/archivo`)
      .set('Cookie', admin.cookie)
      .set('Content-Type', 'application/pdf')
      .set('X-Nombre-Archivo', encodeURIComponent('guía de acuerdos.pdf'))
      .send(PDF_MINIMO)
    expect(subida.status).toBe(200)
    expect(subida.body.recurso.archivo).toMatchObject({
      nombre: 'guía de acuerdos.pdf',
      tamano: PDF_MINIMO.length,
    })

    // Antes de publicar, el archivo no es público.
    await request(app).get(`/api/recursos/${id}/archivo`).expect(404)

    await request(app)
      .patch(`/api/admin/recursos/${id}`)
      .set('Cookie', admin.cookie)
      .send({ estatus: 'publicado' })
      .expect(200)

    const descarga = await request(app).get(`/api/recursos/${id}/archivo`).buffer(true)
    expect(descarga.status).toBe(200)
    expect(descarga.headers['content-type']).toContain('application/pdf')
    expect(descarga.headers['x-content-type-options']).toBe('nosniff')
    expect(Buffer.from(descarga.body).equals(PDF_MINIMO)).toBe(true)

    // Publicado como pdf, quitarle el archivo lo dejaría sin contenido.
    const quitar = await request(app)
      .delete(`/api/admin/recursos/${id}/archivo`)
      .set('Cookie', admin.cookie)
    expect(quitar.status).toBe(400)
  })

  it('rechaza un archivo que no es PDF aunque lo declare', async () => {
    const id = await crear(admin.cookie, {
      ...ARTICULO_COMPLETO,
      tipoRecurso: 'pdf',
      contenido: '',
    })
    const respuesta = await request(app)
      .put(`/api/admin/recursos/${id}/archivo`)
      .set('Cookie', admin.cookie)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from('MZ ejecutable'))
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.codigo).toBe('archivo_invalido')
  })

  it('rechaza un archivo en un tipo que no lo admite', async () => {
    const id = await crear(admin.cookie, ARTICULO_COMPLETO)
    const respuesta = await request(app)
      .put(`/api/admin/recursos/${id}/archivo`)
      .set('Cookie', admin.cookie)
      .set('Content-Type', 'application/pdf')
      .send(PDF_MINIMO)
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.codigo).toBe('archivo_invalido')
  })

  it('descarta el archivo al cambiar a un tipo que no lo admite', async () => {
    const id = await crear(admin.cookie, { ...ARTICULO_COMPLETO, tipoRecurso: 'plantilla' })
    await request(app)
      .put(`/api/admin/recursos/${id}/archivo`)
      .set('Cookie', admin.cookie)
      .set('Content-Type', 'application/pdf')
      .send(PDF_MINIMO)
      .expect(200)

    const respuesta = await request(app)
      .patch(`/api/admin/recursos/${id}`)
      .set('Cookie', admin.cookie)
      .send({ tipoRecurso: 'texto' })
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.recurso.archivo).toBeNull()
    expect(await prisma.archivoRecurso.count()).toBe(0)
  })
})
