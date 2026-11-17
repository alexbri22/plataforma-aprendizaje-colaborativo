import { CRITERIOS_PUBLICACION, MAX_PROPUESTAS_ABIERTAS } from '@plataforma/shared'
import request, { type Response } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

// Autoría abierta con revisión (docs/diseno-desarrollo-formacion.md §6.3 y
// nota del incremento 6).

const app = createApp()

const CORREOS = {
  admin: 'admin.propuestas@ejemplo.com',
  ana: 'ana.propuestas@ejemplo.com',
  beto: 'beto.propuestas@ejemplo.com',
}

type Persona = { id: string; cookie: string }
let admin: Persona
let ana: Persona
let beto: Persona

function extraerCookie(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((valor) => valor.startsWith('sesion='))
  if (!cookie) throw new Error('la respuesta no trae cookie de sesión')
  return cookie.split(';')[0]
}

async function registrar(nombre: string, correo: string): Promise<Persona> {
  const respuesta = await request(app)
    .post('/api/usuarios')
    .send({
      nombre,
      apellidoPaterno: 'Prueba',
      apellidoMaterno: 'Autora',
      nivelEstudios: 'Licenciatura',
      institucionEducativa: 'UNAM',
      correo,
      contrasena: 'contrasena-larga',
    })
    .expect(201)
  return { id: respuesta.body.usuario.idUsuario as string, cookie: extraerCookie(respuesta) }
}

async function limpiar() {
  await prisma.revisionContenido.deleteMany()
  await prisma.constancia.deleteMany()
  await prisma.rutaFormativa.deleteMany()
  await prisma.inscripcionCurso.deleteMany()
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

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms))
}

const TODOS_LOS_CRITERIOS = CRITERIOS_PUBLICACION.map((c) => c.id)

/** Un artículo completo: cumple los mínimos de publicación. */
const ARTICULO = {
  seccion: 'como_colaborar',
  titulo: 'Cómo dar retroalimentación útil',
  resumen: 'Una guía breve.',
  tipoRecurso: 'texto',
  contenido: 'Contenido del artículo.',
  area: 'comunicacion',
  elementos: ['interaccion_promotora'],
  duracionMin: 5,
  fuente: 'Ana Prueba',
  licencia: 'CC BY 4.0',
}

async function proponerRecurso(quien: Persona, datos: object = ARTICULO): Promise<string> {
  const { body } = await como(quien).post('/api/me/propuestas/recursos', datos).expect(201)
  return body.recurso.idRecurso as string
}

function enviar(quien: Persona, tipo: 'recursos' | 'cursos', id: string) {
  return como(quien).post(`/api/me/propuestas/${tipo}/${id}/envio`)
}

function decidir(tipo: 'recursos' | 'cursos', id: string, cuerpo: object) {
  return como(admin).post(`/api/admin/revisiones/${tipo}/${id}/decision`, cuerpo)
}

/** Recurso editorial publicado, para usarlo en las lecciones de un curso. */
async function recursoEditorialPublicado(): Promise<string> {
  const { body } = await como(admin)
    .post('/api/admin/recursos', {
      ...ARTICULO,
      titulo: 'Plantilla editorial',
      estatus: 'publicado',
    })
    .expect(201)
  return body.recurso.idRecurso as string
}

const FICHA_CURSO = {
  titulo: 'Reuniones que deciden',
  resumen: 'Resumen del curso.',
  objetivo: 'Objetivo del curso.',
  area: 'coordinacion',
  elementos: ['interaccion_promotora'],
  nivel: 'inicial',
  practicaFinal: 'Una agenda lista.',
}

/** Curso propuesto completo: un recurso publicado, una práctica y una
 * reflexión. */
async function proponerCursoCompleto(quien: Persona, idRecurso: string): Promise<string> {
  const { body } = await como(quien).post('/api/me/propuestas/cursos', FICHA_CURSO).expect(201)
  const id = body.curso.idCurso as string
  const lecciones = [
    { tipo: 'recurso', idRecurso },
    { tipo: 'practica', titulo: 'Practica', contenido: 'Pasos.', duracionMin: 10 },
    { tipo: 'reflexion', titulo: 'Reflexiona', contenido: '¿Qué cambiarás?', duracionMin: 5 },
  ]
  for (const leccion of lecciones) {
    await como(quien).post(`/api/me/propuestas/cursos/${id}/lecciones`, leccion).expect(201)
  }
  return id
}

describe('autorización', () => {
  it.each([
    ['get', '/api/me/propuestas'],
    ['get', '/api/me/propuestas/avisos'],
    ['post', '/api/me/propuestas/recursos'],
    ['post', '/api/me/propuestas/cursos'],
    ['post', '/api/me/propuestas/recursos/x/envio'],
    ['delete', '/api/me/propuestas/recursos/x/envio'],
  ])('%s %s responde 401 sin sesión', async (metodo, ruta) => {
    const respuesta = await request(app)[metodo as 'get'](ruta)
    expect(respuesta.status).toBe(401)
  })

  it.each([
    ['get', '/api/admin/revisiones'],
    ['get', '/api/admin/revisiones/recursos/x'],
    ['post', '/api/admin/revisiones/recursos/x/decision'],
  ])('%s %s es solo del administrador', async (metodo, ruta) => {
    expect((await request(app)[metodo as 'get'](ruta)).status).toBe(401)
    expect((await como(ana)[metodo as 'get'](ruta)).status).toBe(403)
  })
})

describe('una propuesta mientras su autor la prepara', () => {
  it('nace en borrador y solo la ve su autor', async () => {
    const id = await proponerRecurso(ana)
    const propia = await como(ana).get(`/api/me/propuestas/recursos/${id}`).expect(200)
    expect(propia.body.recurso).toMatchObject({ estatus: 'borrador', origen: 'propuesta' })

    await como(beto).get(`/api/me/propuestas/recursos/${id}`).expect(404)
    await como(admin).get(`/api/admin/recursos/${id}`).expect(404)
    const panel = await como(admin).get('/api/admin/recursos').expect(200)
    expect(panel.body.recursos).toEqual([])
    await request(app).get(`/api/recursos/${id}`).expect(404)
  })

  it('el autor no decide el estado ni el lugar en el catálogo', async () => {
    const respuesta = await como(ana).post('/api/me/propuestas/recursos', {
      ...ARTICULO,
      estatus: 'publicado',
      orden: 0,
    })
    expect(respuesta.status).toBe(400)
    expect(Object.keys(respuesta.body.detallePorCampo).sort()).toEqual(['estatus', 'orden'])
  })

  it('una edición con una versión vieja no pisa lo que se guardó después', async () => {
    const id = await proponerRecurso(ana)
    const { body } = await como(ana).get(`/api/me/propuestas/recursos/${id}`)
    const version = body.recurso.versionFicha as number
    await como(ana)
      .patch(`/api/me/propuestas/recursos/${id}`, { resumen: 'Uno', versionFicha: version })
      .expect(200)
    const vieja = await como(ana).patch(`/api/me/propuestas/recursos/${id}`, {
      resumen: 'Dos',
      versionFicha: version,
    })
    expect(vieja.status).toBe(409)
    expect(vieja.body.codigo).toBe('recurso_desactualizado')
  })

  it('el PDF de la propuesta solo lo ve su autor', async () => {
    const id = await proponerRecurso(ana, { ...ARTICULO, tipoRecurso: 'pdf', contenido: '' })
    await request(app)
      .put(`/api/me/propuestas/recursos/${id}/archivo`)
      .set('Cookie', ana.cookie)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from('%PDF-1.4 prueba'))
      .expect(200)
    await como(ana).get(`/api/me/propuestas/recursos/${id}/archivo`).buffer(true).expect(200)
    await como(beto).get(`/api/me/propuestas/recursos/${id}/archivo`).expect(404)
    await como(admin).get(`/api/admin/recursos/${id}/archivo`).expect(404)
  })
})

describe('enviar a revisión', () => {
  it('exige los mínimos de publicación', async () => {
    const id = await proponerRecurso(ana, { ...ARTICULO, resumen: '', fuente: '' })
    const respuesta = await enviar(ana, 'recursos', id)
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo).toHaveProperty('resumen')
    expect(respuesta.body.detallePorCampo).toHaveProperty('fuente')
  })

  it('la congela: nadie la edita ni la borra, y llega a la cola', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)

    const edicion = await como(ana).patch(`/api/me/propuestas/recursos/${id}`, { resumen: 'X' })
    expect(edicion.status).toBe(409)
    expect(edicion.body.codigo).toBe('propuesta_no_editable')
    const borrado = await como(ana).delete(`/api/me/propuestas/recursos/${id}`)
    expect(borrado.body.codigo).toBe('propuesta_no_eliminable')
    const delAdmin = await como(admin).patch(`/api/admin/recursos/${id}`, { resumen: 'X' })
    expect(delAdmin.body.codigo).toBe('propuesta_no_editable')

    const cola = await como(admin).get('/api/admin/revisiones').expect(200)
    expect(cola.body.propuestas).toEqual([
      expect.objectContaining({
        tipo: 'recurso',
        id,
        titulo: ARTICULO.titulo,
        autor: 'Ana Prueba Autora',
      }),
    ])
    const detalle = await como(admin).get(`/api/admin/revisiones/recursos/${id}`).expect(200)
    expect(detalle.body.recurso.contenido).toBe(ARTICULO.contenido)
  })

  it('cancelar el envío la devuelve a borrador y queda en el historial', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)
    await como(ana).delete(`/api/me/propuestas/recursos/${id}/envio`).expect(204)

    const { body } = await como(ana).get(`/api/me/propuestas/recursos/${id}`).expect(200)
    expect(body.recurso.estatus).toBe('borrador')
    expect(body.recurso.revision.historial.map((h: { accion: string }) => h.accion)).toEqual([
      'enviada',
      'cancelada',
    ])
    await como(ana).patch(`/api/me/propuestas/recursos/${id}`, { resumen: 'Otra' }).expect(200)
  })
})

describe('decisiones del administrador', () => {
  it('aprobar exige los siete criterios y publica, con aviso para el autor', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)

    const sinCriterios = await decidir('recursos', id, { decision: 'aprobar' })
    expect(sinCriterios.status).toBe(400)
    expect(sinCriterios.body.detallePorCampo).toHaveProperty('criterios')

    await decidir('recursos', id, { decision: 'aprobar', criterios: TODOS_LOS_CRITERIOS }).expect(
      200,
    )
    await request(app).get(`/api/recursos/${id}`).expect(200)

    const lista = await como(ana).get('/api/me/propuestas').expect(200)
    expect(lista.body.avisosPendientes).toBe(1)
    expect(lista.body.propuestas[0]).toMatchObject({
      estatus: 'publicado',
      decisionSinVer: true,
      ultimaDecision: { accion: 'aprobada' },
    })
    await como(ana).put(`/api/me/propuestas/recursos/${id}/aviso-visto`).expect(204)
    const avisos = await como(ana).get('/api/me/propuestas/avisos').expect(200)
    expect(avisos.body.pendientes).toBe(0)

    // Publicada, la cuida el administrador: el autor ya no la toca.
    const edicion = await como(ana).patch(`/api/me/propuestas/recursos/${id}`, { resumen: 'X' })
    expect(edicion.body.codigo).toBe('propuesta_no_editable')
    await como(admin).patch(`/api/admin/recursos/${id}`, { resumen: 'Corregido' }).expect(200)
    const borrado = await como(admin).delete(`/api/admin/recursos/${id}`)
    expect(borrado.body.codigo).toBe('propuesta_no_eliminable')
  })

  it('pedir cambios exige motivo y la devuelve, privada, a su autor', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)

    const sinMotivo = await decidir('recursos', id, { decision: 'pedir_cambios', motivo: '  ' })
    expect(sinMotivo.body.detallePorCampo).toHaveProperty('motivo')
    await decidir('recursos', id, {
      decision: 'pedir_cambios',
      motivo: 'Agrega un ejemplo situado en trabajo estudiantil.',
    }).expect(200)

    await como(admin).get(`/api/admin/revisiones/recursos/${id}`).expect(404)
    const propia = await como(ana).get(`/api/me/propuestas/recursos/${id}`).expect(200)
    expect(propia.body.recurso.estatus).toBe('cambios_solicitados')
    expect(propia.body.recurso.revision.historial.at(-1)).toMatchObject({
      accion: 'cambios_solicitados',
      motivo: 'Agrega un ejemplo situado en trabajo estudiantil.',
    })
    // El autor no ve qué administrador decidió.
    expect(propia.body.recurso.revision.historial.at(-1)).not.toHaveProperty('actor')

    await como(ana)
      .patch(`/api/me/propuestas/recursos/${id}`, { contenido: 'Con ejemplo.' })
      .expect(200)
    await enviar(ana, 'recursos', id).expect(204)
    const historial = await como(admin).get(`/api/admin/revisiones/recursos/${id}`).expect(200)
    expect(historial.body.historial.map((h: { accion: string }) => h.accion)).toEqual([
      'enviada',
      'cambios_solicitados',
      'enviada',
    ])
    expect(historial.body.historial[1].actor).toBe('Grace Prueba Autora')
  })

  it('rechazar es definitivo; el autor puede borrarla y el registro queda', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)
    await decidir('recursos', id, {
      decision: 'rechazar',
      motivo: 'No trata de colaboración.',
    }).expect(200)

    const edicion = await como(ana).patch(`/api/me/propuestas/recursos/${id}`, { resumen: 'X' })
    expect(edicion.body.codigo).toBe('propuesta_no_editable')
    expect((await enviar(ana, 'recursos', id)).body.codigo).toBe('propuesta_no_editable')

    await como(ana).delete(`/api/me/propuestas/recursos/${id}`).expect(204)
    expect(await prisma.revisionContenido.count({ where: { idContenido: id } })).toBe(2)
  })

  it('retirar una propuesta publicada exige motivo; se puede publicar de nuevo', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)
    await decidir('recursos', id, { decision: 'aprobar', criterios: TODOS_LOS_CRITERIOS }).expect(
      200,
    )

    // Desde el editor del panel no: va por la cola, con motivo.
    const directo = await como(admin).patch(`/api/admin/recursos/${id}`, { estatus: 'retirado' })
    expect(directo.body.codigo).toBe('propuesta_no_editable')

    await decidir('recursos', id, { decision: 'retirar', motivo: 'Enlace roto.' }).expect(200)
    await request(app).get(`/api/recursos/${id}`).expect(404)
    await decidir('recursos', id, { decision: 'publicar_de_nuevo' }).expect(200)
    await request(app).get(`/api/recursos/${id}`).expect(200)
  })

  it('una decisión sobre algo que ya no está en ese estado responde 409', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)
    await decidir('recursos', id, { decision: 'rechazar', motivo: 'No.' }).expect(200)
    const otra = await decidir('recursos', id, {
      decision: 'aprobar',
      criterios: TODOS_LOS_CRITERIOS,
    })
    expect(otra.status).toBe(409)
    expect(otra.body.codigo).toBe('revision_desactualizada')
  })

  it('el contenido editorial no pasa por la cola', async () => {
    const id = await recursoEditorialPublicado()
    await decidir('recursos', id, { decision: 'retirar', motivo: 'X' }).expect(404)
    const estatus = await como(admin).patch(`/api/admin/recursos/${id}`, { estatus: 'en_revision' })
    expect(estatus.status).toBe(400)
  })
})

describe('propuesta de curso', () => {
  it('sus lecciones solo usan recursos publicados', async () => {
    const borrador = (
      await como(admin)
        .post('/api/admin/recursos', { ...ARTICULO, titulo: 'Borrador' })
        .expect(201)
    ).body.recurso.idRecurso as string
    const ajena = await proponerRecurso(beto)
    const { body } = await como(ana).post('/api/me/propuestas/cursos', FICHA_CURSO).expect(201)
    const id = body.curso.idCurso as string

    const conBorrador = await como(ana).post(`/api/me/propuestas/cursos/${id}/lecciones`, {
      tipo: 'recurso',
      idRecurso: borrador,
    })
    expect(conBorrador.status).toBe(400)
    const conAjena = await como(ana).post(`/api/me/propuestas/cursos/${id}/lecciones`, {
      tipo: 'recurso',
      idRecurso: ajena,
    })
    expect(conAjena.status).toBe(404)
  })

  it('se envía, se congela con sus lecciones y al aprobarse se publica', async () => {
    const idRecurso = await recursoEditorialPublicado()
    const id = await proponerCursoCompleto(ana, idRecurso)
    await enviar(ana, 'cursos', id).expect(204)

    const leccion = await como(ana).post(`/api/me/propuestas/cursos/${id}/lecciones`, {
      tipo: 'practica',
      titulo: 'Otra',
      contenido: 'Más.',
      duracionMin: 5,
    })
    expect(leccion.body.codigo).toBe('propuesta_no_editable')

    await decidir('cursos', id, { decision: 'aprobar', criterios: TODOS_LOS_CRITERIOS }).expect(200)
    const publico = await request(app).get(`/api/cursos/${id}`).expect(200)
    expect(publico.body.curso.autor).toBe('Ana Prueba')
  })

  it('un curso sin sus mínimos no se envía', async () => {
    const { body } = await como(ana).post('/api/me/propuestas/cursos', FICHA_CURSO).expect(201)
    const respuesta = await enviar(ana, 'cursos', body.curso.idCurso)
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo).toHaveProperty('lecciones')
  })

  it('el panel no ve el título de una propuesta que se prepara ni la mete en una ruta', async () => {
    const idRecurso = await recursoEditorialPublicado()
    const id = await proponerCursoCompleto(ana, idRecurso)

    const recurso = await como(admin).get(`/api/admin/recursos/${idRecurso}`).expect(200)
    expect(recurso.body.recurso.usadoEn).toEqual([
      expect.objectContaining({ idCurso: id, titulo: expect.not.stringContaining('Reuniones') }),
    ])
    const { body } = await como(admin).post('/api/admin/rutas', { titulo: 'Ruta' }).expect(201)
    await como(admin)
      .put(`/api/admin/rutas/${body.ruta.idRuta}/cursos`, { cursos: [id] })
      .expect(404)
  })
})

describe('límites por persona', () => {
  it(`a lo más ${MAX_PROPUESTAS_ABIERTAS} propuestas en preparación`, async () => {
    for (let i = 0; i < MAX_PROPUESTAS_ABIERTAS; i++) await proponerRecurso(ana)
    const otra = await como(ana).post('/api/me/propuestas/recursos', ARTICULO)
    expect(otra.status).toBe(409)
    expect(otra.body.codigo).toBe('limite_propuestas')
    // Es por persona.
    await proponerRecurso(beto)
  })

  it('a lo más tres en revisión a la vez', async () => {
    const ids = [
      await proponerRecurso(ana),
      await proponerRecurso(ana),
      await proponerRecurso(ana),
      await proponerRecurso(ana),
    ]
    for (const id of ids.slice(0, 3)) await enviar(ana, 'recursos', id).expect(204)
    const cuarta = await enviar(ana, 'recursos', ids[3])
    expect(cuarta.status).toBe(409)
    expect(cuarta.body.codigo).toBe('limite_propuestas')
  })
})

describe('cambios simultáneos', () => {
  // Dos envíos a la vez cuando ya hay dos en revisión. La transacción de la
  // prueba hace de uno de ellos: ya pasó su propia propuesta a revisión y
  // tiene el candado de la persona, sin confirmar. Sin el candado, el otro
  // envío cuenta dos (no ve el tercero) y deja cuatro en la cola.
  it('dos envíos simultáneos no pasan el límite', async () => {
    const ids = [
      await proponerRecurso(ana),
      await proponerRecurso(ana),
      await proponerRecurso(ana),
      await proponerRecurso(ana),
    ]
    for (const id of ids.slice(0, 2)) await enviar(ana, 'recursos', id).expect(204)

    let otro: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_recurso FROM recursos_formativos WHERE id_recurso = ${ids[2]} FOR UPDATE`
      await tx.recursoFormativo.update({
        where: { idRecurso: ids[2] },
        data: { estatus: 'en_revision', fechaEnvio: new Date() },
      })
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`propuestas:${ana.id}`}))`
      otro = enviar(ana, 'recursos', ids[3]).then((r) => r)
      await esperar(300)
    })

    expect((await otro)?.status).toBe(409)
    expect(
      await prisma.recursoFormativo.count({
        where: { idUsuarioAutor: ana.id, estatus: 'en_revision' },
      }),
    ).toBe(3)
  })

  // El autor cancela el envío mientras el administrador aprueba. La
  // transacción de la prueba hace de la cancelación, sin confirmar. Sin el
  // bloqueo de la fila, la aprobación lee "en revisión", valida y publica
  // algo que su autor ya retiró de la cola.
  it('aprobar mientras el autor cancela el envío responde 409', async () => {
    const id = await proponerRecurso(ana)
    await enviar(ana, 'recursos', id).expect(204)

    let aprobacion: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_recurso FROM recursos_formativos WHERE id_recurso = ${id} FOR UPDATE`
      await tx.recursoFormativo.update({ where: { idRecurso: id }, data: { estatus: 'borrador' } })
      aprobacion = decidir('recursos', id, {
        decision: 'aprobar',
        criterios: TODOS_LOS_CRITERIOS,
      }).then((r) => r)
      await esperar(300)
    })

    expect((await aprobacion)?.status).toBe(409)
    const fila = await prisma.recursoFormativo.findUniqueOrThrow({ where: { idRecurso: id } })
    expect(fila.estatus).toBe('borrador')
  })

  // Se retira el recurso de una lección mientras se aprueba el curso. La
  // transacción de la prueba hace del retiro, sin confirmar. Sin el bloqueo
  // compartido de los recursos, la aprobación lo lee publicado y publica un
  // curso con una lección que no se abre.
  it('aprobar un curso mientras se retira uno de sus recursos no lo publica', async () => {
    const idRecurso = await recursoEditorialPublicado()
    const id = await proponerCursoCompleto(ana, idRecurso)
    await enviar(ana, 'cursos', id).expect(204)

    let aprobacion: Promise<Response> | undefined
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_recurso FROM recursos_formativos WHERE id_recurso = ${idRecurso} FOR UPDATE`
      await tx.recursoFormativo.update({ where: { idRecurso }, data: { estatus: 'retirado' } })
      aprobacion = decidir('cursos', id, {
        decision: 'aprobar',
        criterios: TODOS_LOS_CRITERIOS,
      }).then((r) => r)
      await esperar(300)
    })

    expect((await aprobacion)?.status).toBe(400)
    const curso = await prisma.curso.findUniqueOrThrow({ where: { idCurso: id } })
    expect(curso.estatus).toBe('en_revision')
  })
})
