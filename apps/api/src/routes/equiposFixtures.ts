import request, { type Response } from 'supertest'
import { expect } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'

// Utilidades de las pruebas de integración de equipos. Cada archivo de pruebas
// las importa por separado, así que cada uno tiene su propia aplicación y su
// propio límite de registros (el de producción se sustituye por uno de 300 por
// archivo, y un solo archivo con todas las pruebas lo rebasaba).

export const app = createApp()

export const DATOS_ACTIVIDAD = {
  nombre: 'Proyecto de ecosistemas',
  objetivo: 'Investigar el impacto humano en un ecosistema local.',
  informacionGeneral: 'Reporte escrito más presentación de 10 minutos.',
  fechaInicio: '2026-09-10',
  fechaTermino: '2026-11-01',
  fechaLimiteInscripcion: '2026-09-15',
  plazoCierreDias: 10,
  numeroEquiposEsperado: 3,
}

export function extraerCookie(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((valor) => valor.startsWith('sesion='))
  if (!cookie) throw new Error('la respuesta no trae cookie de sesión')
  return cookie.split(';')[0]
}

// El correo lleva un contador: una prueba puede crear varias actividades y
// el correo es único.
let contadorCorreos = 0

export async function registrar(nombre: string): Promise<{ cookie: string; idUsuario: string }> {
  const respuesta = await request(app)
    .post('/api/usuarios')
    .send({
      nombre,
      apellidoPaterno: 'Prueba',
      apellidoMaterno: 'Equipos',
      nivelEstudios: 'Licenciatura',
      institucionEducativa: 'UNAM',
      correo: `${nombre.toLowerCase()}${(contadorCorreos += 1)}@ejemplo.com`,
      contrasena: 'contrasena-larga',
    })
  return { cookie: extraerCookie(respuesta), idUsuario: respuesta.body.usuario.idUsuario }
}

export interface Persona {
  cookie: string
  idUsuario: string
  idMembresia: string
  nombre: string
}

export interface Escenario {
  id: string
  claveIngreso: string
  organizador: Persona
  participantes: Persona[]
}

export async function idMembresiaDe(idActividad: string, idUsuario: string): Promise<string> {
  const m = await prisma.membresia.findFirstOrThrow({ where: { idActividad, idUsuario } })
  return m.idMembresia
}

// Actividad con n participantes unidos, todavía en inscripción.
export async function actividadConParticipantes(n: number): Promise<Escenario> {
  const organizador = await registrar('Olga')
  const creada = await request(app)
    .post('/api/actividades')
    .set('Cookie', organizador.cookie)
    .send(DATOS_ACTIVIDAD)
  const id: string = creada.body.actividad.id
  const claveIngreso: string = creada.body.actividad.claveIngreso

  const participantes: Persona[] = []
  for (let i = 1; i <= n; i += 1) {
    const nombre = `Pablo${i}`
    const { cookie, idUsuario } = await registrar(nombre)
    const union = await request(app).post(`/api/claves/${claveIngreso}/union`).set('Cookie', cookie)
    expect(union.status).toBe(201)
    participantes.push({
      cookie,
      idUsuario,
      nombre,
      idMembresia: await idMembresiaDe(id, idUsuario),
    })
  }

  return {
    id,
    claveIngreso,
    organizador: {
      ...organizador,
      nombre: 'Olga',
      idMembresia: await idMembresiaDe(id, organizador.idUsuario),
    },
    participantes,
  }
}

// Igual, pero con la inscripción cerrada: la actividad está en formación.
export async function actividadEnFormacion(n: number): Promise<Escenario> {
  const escenario = await actividadConParticipantes(n)
  const cierre = await request(app)
    .post(`/api/actividades/${escenario.id}/inscripcion/cierre`)
    .set('Cookie', escenario.organizador.cookie)
  expect(cierre.status).toBe(200)
  return escenario
}

export async function fijarFormacion(e: Escenario, estado: string) {
  const respuesta = await request(app)
    .put(`/api/actividades/${e.id}/configuracion/formacion_equipos`)
    .set('Cookie', e.organizador.cookie)
    .send({ estado })
  expect(respuesta.status).toBe(200)
}

export const crear = (id: string, cookie: string, nombre: string) =>
  request(app).post(`/api/actividades/${id}/equipos`).set('Cookie', cookie).send({ nombre })

export const asignar = (idEquipo: string, idMembresia: string, cookie: string) =>
  request(app).put(`/api/equipos/${idEquipo}/integrantes/${idMembresia}`).set('Cookie', cookie)

export const listar = (id: string, cookie: string) =>
  request(app).get(`/api/actividades/${id}/equipos`).set('Cookie', cookie)

export const cerrarFormacion = (id: string, cookie: string) =>
  request(app).post(`/api/actividades/${id}/formacion/cierre`).set('Cookie', cookie)

export async function estadoDe(id: string) {
  return (await prisma.actividad.findUniqueOrThrow({ where: { idActividad: id } })).estado
}

export function eventos(idActividad: string, tipoEvento: string) {
  return prisma.historial.findMany({
    where: { idActividad, tipoEvento },
    orderBy: { fecha: 'asc' },
  })
}

export async function idEquipoCreado(id: string, cookie: string, nombre: string): Promise<string> {
  const respuesta = await crear(id, cookie, nombre)
  expect(respuesta.status).toBe(201)
  return respuesta.body.equipo.id
}

// Vacía las tablas que tocan las pruebas de equipos, para cada prueba.
export async function limpiarBD() {
  await prisma.membresia.deleteMany()
  await prisma.actividad.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
}
