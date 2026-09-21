import request, { type Response } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
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

const DIA = 24 * 60 * 60 * 1000

function cookieDe(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((v) => v.startsWith('sesion='))
  if (!cookie) throw new Error('sin cookie de sesión')
  return cookie.split(';')[0]
}

interface Cuenta {
  nombre: string
  idUsuario: string
  cookie: string
}

// Un grupo fijo de cuentas, registradas una sola vez: el registro tiene un
// límite de intentos por proceso y estas pruebas necesitan más personas de
// las que caben. El registro y la unión por clave ya tienen sus pruebas; aquí
// las actividades y membresías se crean directo en la base.
const cuentas: Cuenta[] = []

async function registrar(nombre: string): Promise<Cuenta> {
  const r = await request(app)
    .post('/api/usuarios')
    .send({ ...REGISTRO, nombre, correo: `${nombre.toLowerCase()}@ejemplo.com` })
  const cookie = cookieDe(r)
  const usuario = await prisma.usuario.findFirstOrThrow({ where: { nombre } })
  return { nombre, idUsuario: usuario.idUsuario, cookie }
}

interface Miembro extends Cuenta {
  idMembresia: string
}

interface Escenario {
  id: string
  organizador: Miembro
  participantes: Miembro[]
}

// Organizador más N participantes. Una actividad cuyo término fue hace
// `terminoHaceDias` días y cuyo cierre dura 10: con 1, el ritual está abierto
// hoy; con 30, ya se aplicó; con -5, todavía no termina.
async function montarActividad(numParticipantes: number, terminoHaceDias = 1): Promise<Escenario> {
  const termino = new Date(Date.now() - terminoHaceDias * DIA)
  const actividad = await prisma.actividad.create({
    data: {
      nombre: 'Proyecto de ecosistemas',
      objetivo: 'Investigar el impacto humano en un ecosistema local.',
      informacionGeneral: 'Reporte escrito más presentación.',
      fechaInicio: new Date(termino.getTime() - 30 * DIA),
      fechaTermino: termino,
      fechaLimiteInscripcion: new Date(termino.getTime() - 20 * DIA),
      plazoCierreDias: 10,
      numeroEquiposEsperado: 2,
      claveIngreso: `CLAVE-${Math.random().toString(36).slice(2, 8)}`,
    },
  })

  const [org, ...resto] = cuentas
  const membresiaOrg = await prisma.membresia.create({
    data: { idActividad: actividad.idActividad, idUsuario: org.idUsuario, rol: 'organizador' },
  })
  const participantes: Miembro[] = []
  for (const cuenta of resto.slice(0, numParticipantes)) {
    const m = await prisma.membresia.create({
      data: {
        idActividad: actividad.idActividad,
        idUsuario: cuenta.idUsuario,
        rol: 'participante',
      },
    })
    participantes.push({ ...cuenta, idMembresia: m.idMembresia })
  }
  return {
    id: actividad.idActividad,
    organizador: { ...org, idMembresia: membresiaOrg.idMembresia },
    participantes,
  }
}

function reconocer(idMembresiaReceptor: string, categoria = 'liderazgo', frase = 'Nos destrabó') {
  return { idMembresiaReceptor, categoria, frase }
}

beforeAll(async () => {
  await prisma.insigniaOtorgada.deleteMany()
  await prisma.membresia.deleteMany()
  await prisma.actividad.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
  for (const nombre of ['Org', 'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'Ajeno']) {
    cuentas.push(await registrar(nombre))
  }
})

beforeEach(async () => {
  await prisma.insigniaOtorgada.deleteMany()
  await prisma.membresia.deleteMany()
  await prisma.actividad.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

function ajeno(): Cuenta {
  return cuentas[cuentas.length - 1]
}

describe('GET /api/actividades/:id/reconocimientos', () => {
  it('da a un participante sus compañeros, su presupuesto y la ventana', async () => {
    // Seis participantes: el 33 % de seis, sin contarse, son dos.
    const { id, participantes } = await montarActividad(6)
    const [yo] = participantes

    const r = await request(app)
      .get(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)

    expect(r.status).toBe(200)
    expect(r.body.contexto.rol).toBe('participante')
    expect(r.body.contexto.presupuesto).toBe(2)
    expect(r.body.contexto.abierto).toBe(true)
    expect(r.body.contexto.aplicados).toBe(false)
    expect(r.body.contexto.companeros).toHaveLength(5)
    expect(
      r.body.contexto.companeros.map((c: { idMembresia: string }) => c.idMembresia),
    ).not.toContain(yo.idMembresia)
  })

  it('no da presupuesto a quien organiza', async () => {
    const { id, organizador } = await montarActividad(3)

    const r = await request(app)
      .get(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', organizador.cookie)

    expect(r.body.contexto.rol).toBe('organizador')
    expect(r.body.contexto.presupuesto).toBeNull()
    expect(r.body.contexto.companeros).toHaveLength(3)
  })

  it('responde como inexistente a quien no es miembro', async () => {
    const { id } = await montarActividad(1)
    const r = await request(app)
      .get(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', ajeno().cookie)

    expect(r.status).toBe(404)
  })
})

describe('PUT /api/actividades/:id/reconocimientos', () => {
  it('guarda y reemplaza el conjunto completo: es un borrador, no un alta', async () => {
    const { id, participantes } = await montarActividad(4)
    const [yo, a, b] = participantes

    await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia)] })
    const r = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(b.idMembresia, 'ideas')] })

    expect(r.status).toBe(200)
    const guardados = await prisma.insigniaOtorgada.findMany({
      where: { idMembresiaOtorgante: yo.idMembresia },
    })
    expect(guardados).toHaveLength(1)
    expect(guardados[0].idMembresiaReceptor).toBe(b.idMembresia)
  })

  it('un par vale 1 punto y quien organiza vale 2', async () => {
    const { id, organizador, participantes } = await montarActividad(3)
    const [yo, a] = participantes

    await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia)] })
    await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', organizador.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia, 'compromiso')] })

    const filas = await prisma.insigniaOtorgada.findMany({
      where: { idMembresiaReceptor: a.idMembresia },
      orderBy: { puntos: 'asc' },
    })
    expect(filas.map((f) => [f.fuente, f.puntos])).toEqual([
      ['par', 1],
      ['organizador', 2],
    ])
  })

  it('rechaza superar el presupuesto de personas, pero no de insignias por persona', async () => {
    // Cuatro participantes: presupuesto de 1. A esa persona, las que sean.
    const { id, participantes } = await montarActividad(4)
    const [yo, a, b] = participantes

    const demasiadas = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia), reconocer(b.idMembresia)] })
    expect(demasiadas.status).toBe(400)
    expect(demasiadas.body.detallePorCampo.reconocimientos).toMatch(/una sola persona|máximo/)

    const variasAUna = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({
        reconocimientos: [
          reconocer(a.idMembresia, 'liderazgo'),
          reconocer(a.idMembresia, 'ideas'),
          reconocer(a.idMembresia, 'compromiso'),
        ],
      })
    expect(variasAUna.status).toBe(200)
  })

  it('quien organiza no tiene presupuesto', async () => {
    const { id, organizador, participantes } = await montarActividad(5)

    const r = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', organizador.cookie)
      .send({ reconocimientos: participantes.map((p) => reconocer(p.idMembresia)) })

    expect(r.status).toBe(200)
  })

  it('no deja reconocerse a uno mismo ni a quien no es de la actividad', async () => {
    const { id, participantes } = await montarActividad(3)
    const otra = await montarActividad(1)
    const [yo] = participantes

    const aMi = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(yo.idMembresia)] })
    expect(aMi.status).toBe(400)

    const aAjeno = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(otra.participantes[0].idMembresia)] })
    expect(aAjeno.status).toBe(400)
  })

  it('no deja repetir la misma insignia a la misma persona', async () => {
    const { id, participantes } = await montarActividad(3)
    const [yo, a] = participantes

    const r = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia), reconocer(a.idMembresia)] })

    expect(r.status).toBe(400)
  })

  it('exige frase y rechaza categorías fuera del catálogo', async () => {
    const { id, participantes } = await montarActividad(3)
    const [yo, a] = participantes

    const sinFrase = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia, 'liderazgo', '   ')] })
    expect(sinFrase.status).toBe(400)

    const invalida = await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia, 'puntualidad')] })
    expect(invalida.status).toBe(400)
  })

  it('solo admite guardar entre el término y el fin del cierre', async () => {
    const futura = await montarActividad(3, -5) // termina en 5 días
    const [yo, a] = futura.participantes
    const antes = await request(app)
      .put(`/api/actividades/${futura.id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia)] })
    expect(antes.status).toBe(409)

    const cerrada = await montarActividad(3, 30) // terminó hace 30, cierre de 10
    const despues = await request(app)
      .put(`/api/actividades/${cerrada.id}/reconocimientos`)
      .set('Cookie', cerrada.participantes[0].cookie)
      .send({ reconocimientos: [reconocer(cerrada.participantes[1].idMembresia)] })
    expect(despues.status).toBe(409)
  })
})

describe('visibilidad de lo recibido', () => {
  it('quien lo recibió no lo ve hasta que termina el cierre', async () => {
    const { id, participantes } = await montarActividad(3)
    const [yo, a] = participantes
    await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia)] })

    const r = await request(app)
      .get(`/api/actividades/${id}/reconocimientos/recibidos`)
      .set('Cookie', a.cookie)

    expect(r.body.aplicados).toBe(false)
    expect(r.body.reconocimientos).toEqual([])
  })

  it('después del cierre lo ve sin saber quién se lo dio', async () => {
    const { id, participantes } = await montarActividad(3, 30)
    const [yo, a] = participantes
    // La ventana ya cerró: se inserta directo para simular lo guardado a tiempo.
    await prisma.insigniaOtorgada.create({
      data: {
        categoria: 'liderazgo',
        idMembresiaOtorgante: yo.idMembresia,
        idMembresiaReceptor: a.idMembresia,
        fuente: 'par',
        puntos: 1,
        frase: 'Nos destrabó',
      },
    })

    const r = await request(app)
      .get(`/api/actividades/${id}/reconocimientos/recibidos`)
      .set('Cookie', a.cookie)

    expect(r.body.aplicados).toBe(true)
    expect(r.body.reconocimientos).toHaveLength(1)
    expect(r.body.reconocimientos[0]).not.toHaveProperty('otorgadoPor')
    expect(r.body.reconocimientos[0]).not.toHaveProperty('idMembresiaOtorgante')
  })

  it('quien organiza ve lo de cada participante con autoría, y un participante no', async () => {
    const { id, organizador, participantes } = await montarActividad(3)
    const [yo, a, b] = participantes
    await request(app)
      .put(`/api/actividades/${id}/reconocimientos`)
      .set('Cookie', yo.cookie)
      .send({ reconocimientos: [reconocer(a.idMembresia)] })

    const org = await request(app)
      .get(`/api/actividades/${id}/participantes/${a.idMembresia}/reconocimientos`)
      .set('Cookie', organizador.cookie)
    expect(org.status).toBe(200)
    expect(org.body.reconocimientos[0].otorgadoPor).toBe('P0 Lovelace')

    const par = await request(app)
      .get(`/api/actividades/${id}/participantes/${a.idMembresia}/reconocimientos`)
      .set('Cookie', b.cookie)
    expect(par.status).toBe(403)
  })
})

describe('GET /api/insignias/acumulado', () => {
  it('suma solo actividades cuyo cierre ya terminó', async () => {
    const abierta = await montarActividad(2)
    const cerrada = await montarActividad(2, 30)
    // Mismo usuario receptor en las dos actividades.
    // Las cuentas se reutilizan entre escenarios: participantes[1] es la
    // misma persona en ambas actividades.
    const receptorAbierta = abierta.participantes[1]
    const membresiaCerrada = cerrada.participantes[1]
    await prisma.insigniaOtorgada.createMany({
      data: [
        {
          categoria: 'ideas',
          idMembresiaOtorgante: abierta.participantes[0].idMembresia,
          idMembresiaReceptor: receptorAbierta.idMembresia,
          fuente: 'par',
          puntos: 1,
          frase: 'x',
        },
        {
          categoria: 'ideas',
          idMembresiaOtorgante: cerrada.participantes[0].idMembresia,
          idMembresiaReceptor: membresiaCerrada.idMembresia,
          fuente: 'organizador',
          puntos: 2,
          frase: 'y',
        },
      ],
    })

    const r = await request(app)
      .get('/api/insignias/acumulado')
      .set('Cookie', receptorAbierta.cookie)

    expect(r.status).toBe(200)
    expect(r.body.acumulado).toEqual({ ideas: 2 })
  })
})
