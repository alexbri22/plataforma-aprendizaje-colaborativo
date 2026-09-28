import request, { type Response } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../data/prisma.js'
import { transicionarActividadesVencidas } from '../services/actividades/actividades.service.js'

const app = createApp()

const DATOS_REGISTRO = {
  nombre: 'Ada',
  apellidoPaterno: 'Lovelace',
  apellidoMaterno: 'Byron',
  nivelEstudios: 'Licenciatura',
  institucionEducativa: 'UNAM',
  correo: 'ada@ejemplo.com',
  contrasena: 'contrasena-larga',
}

// Fechas respecto a hoy, no fijas: la búsqueda por clave deja de admitir
// uniones pasada la fecha límite de inscripción (nucleo §7.5), así que con una
// fecha fija estas pruebas dejarían de poder unir participantes el día que esa
// fecha quedara atrás. Se calcula sin falsear el reloj: los eventos del
// historial se ordenan por su instante de escritura y necesitan uno real.
const UN_DIA_MS = 24 * 60 * 60 * 1000
const enDias = (dias: number) => new Date(Date.now() + dias * UN_DIA_MS)
const comoFecha = (fecha: Date) => fecha.toISOString().slice(0, 10)

const DATOS_ACTIVIDAD = {
  nombre: 'Proyecto de ecosistemas',
  objetivo: 'Investigar el impacto humano en un ecosistema local.',
  informacionGeneral: 'Reporte escrito más presentación de 10 minutos.',
  fechaInicio: comoFecha(enDias(0)),
  fechaTermino: comoFecha(enDias(90)),
  fechaLimiteInscripcion: comoFecha(enDias(30)),
  plazoCierreDias: 10,
  numeroEquiposEsperado: 4,
}

function extraerCookie(respuesta: Response): string {
  const cookies = respuesta.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = cookies?.find((valor) => valor.startsWith('sesion='))
  if (!cookie) throw new Error('la respuesta no trae cookie de sesión')
  return cookie.split(';')[0]
}

async function registrarYObtenerCookie(correo = DATOS_REGISTRO.correo): Promise<string> {
  const respuesta = await request(app)
    .post('/api/usuarios')
    .send({ ...DATOS_REGISTRO, correo })
  return extraerCookie(respuesta)
}

beforeEach(async () => {
  await prisma.membresia.deleteMany()
  await prisma.actividad.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.usuario.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/actividades', () => {
  it('crea la actividad, la membresía de organizador y devuelve la clave de ingreso', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send(DATOS_ACTIVIDAD)

    expect(respuesta.status).toBe(201)
    const { actividad } = respuesta.body
    expect(actividad.nombre).toBe(DATOS_ACTIVIDAD.nombre)
    expect(actividad.fase).toBe('inscripcion')
    expect(actividad.rol).toBe('organizador')
    expect(actividad.numParticipantes).toBe(0)
    expect(actividad.claveIngreso).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/)
    expect(actividad.fechaClave).toBe(`Clave: ${actividad.claveIngreso}`)
    // Fechas de calendario, no el datetime completo de Date#toISOString():
    // apps/web/.../formato.ts las parsea como año-mes-día y truena con hora
    // incluida (docs/diseno-desarrollo-general.md §3.1 no exige una u otra
    // forma, pero el cliente de este incremento sí).
    expect(actividad.fechaInicio).toBe(DATOS_ACTIVIDAD.fechaInicio)
    expect(actividad.fechaTermino).toBe(DATOS_ACTIVIDAD.fechaTermino)
    expect(actividad.fechaLimiteInscripcion).toBe(DATOS_ACTIVIDAD.fechaLimiteInscripcion)

    const membresias = await prisma.membresia.findMany({ where: { idActividad: actividad.id } })
    expect(membresias).toHaveLength(1)
    expect(membresias[0]).toMatchObject({ rol: 'organizador', estado: 'activa' })
  })

  it('acepta el campo opcional tipoActividadPercibida sin persistirlo', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send({ ...DATOS_ACTIVIDAD, tipoActividadPercibida: 'Autodirigida' })

    expect(respuesta.status).toBe(201)
  })

  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).post('/api/actividades').send(DATOS_ACTIVIDAD)
    expect(respuesta.status).toBe(401)
    expect(respuesta.body.codigo).toBe('sin_sesion')
  })

  it('rechaza campos faltantes con 400 y detalle por campo', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send({ nombre: 'Solo nombre' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.codigo).toBe('validacion')
    expect(respuesta.body.detallePorCampo.objetivo).toBeDefined()
    expect(respuesta.body.detallePorCampo.informacionGeneral).toBeDefined()
    expect(respuesta.body.detallePorCampo.fechaInicio).toBeDefined()
    expect(respuesta.body.detallePorCampo.fechaTermino).toBeDefined()
    expect(respuesta.body.detallePorCampo.fechaLimiteInscripcion).toBeDefined()
    expect(respuesta.body.detallePorCampo.plazoCierreDias).toBeDefined()
    expect(respuesta.body.detallePorCampo.numeroEquiposEsperado).toBeDefined()
  })

  it('rechaza una fecha de término anterior o igual a la de inicio', async () => {
    const cookie = await registrarYObtenerCookie()

    const respuesta = await request(app)
      .post('/api/actividades')
      .set('Cookie', cookie)
      .send({ ...DATOS_ACTIVIDAD, fechaTermino: DATOS_ACTIVIDAD.fechaInicio })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.detallePorCampo.fechaTermino).toBeDefined()
  })
})

describe('GET /api/actividades', () => {
  it('responde 401 sin sesión', async () => {
    const respuesta = await request(app).get('/api/actividades')
    expect(respuesta.status).toBe(401)
  })

  it('devuelve solo las actividades donde el actor es miembro, con su rol', async () => {
    const cookieOrganizadora = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieAjena = await registrarYObtenerCookie('grace@ejemplo.com')

    await request(app)
      .post('/api/actividades')
      .set('Cookie', cookieOrganizadora)
      .send(DATOS_ACTIVIDAD)

    const respuestaOrganizadora = await request(app)
      .get('/api/actividades')
      .set('Cookie', cookieOrganizadora)
    expect(respuestaOrganizadora.status).toBe(200)
    expect(respuestaOrganizadora.body.actividades).toHaveLength(1)
    expect(respuestaOrganizadora.body.actividades[0].rol).toBe('organizador')

    const respuestaAjena = await request(app).get('/api/actividades').set('Cookie', cookieAjena)
    expect(respuestaAjena.status).toBe(200)
    expect(respuestaAjena.body.actividades).toHaveLength(0)
  })
})

async function crearActividad(
  cookieOrganizador: string,
): Promise<{ id: string; claveIngreso: string }> {
  const respuesta = await request(app)
    .post('/api/actividades')
    .set('Cookie', cookieOrganizador)
    .send(DATOS_ACTIVIDAD)
  return { id: respuesta.body.actividad.id, claveIngreso: respuesta.body.actividad.claveIngreso }
}

async function unirseComoParticipante(clave: string, cookieParticipante: string): Promise<void> {
  const respuesta = await request(app)
    .post(`/api/claves/${clave}/union`)
    .set('Cookie', cookieParticipante)
  expect(respuesta.status).toBe(201)
}

describe('GET /api/actividades/:id', () => {
  it('devuelve la actividad con capacidades y configuración para el organizador', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .get(`/api/actividades/${id}`)
      .set('Cookie', cookieOrganizador)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.actividad.id).toBe(id)
    expect(new Set(respuesta.body.actividad.capacidades)).toEqual(
      new Set([
        'configurar_funciones',
        'ajustar_periodos',
        'cerrar_inscripcion',
        'agregar_coorganizador',
      ]),
    )
    expect(respuesta.body.actividad.configuracion.formacion_equipos).toBe('autogestionado')
    expect(respuesta.body.actividad.configuracion.bitacora_individual).toBe('deshabilitada')
    const espacioEquipo = JSON.parse(respuesta.body.actividad.configuracion.espacio_equipo)
    expect(espacioEquipo).toEqual({ metas: 'opcional', avances: 'opcional', recursos: 'opcional' })
  })

  it('responde 404 a quien no es miembro, sin distinguir de una actividad inexistente', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieAjena = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuestaAjena = await request(app)
      .get(`/api/actividades/${id}`)
      .set('Cookie', cookieAjena)
    expect(respuestaAjena.status).toBe(404)
    expect(respuestaAjena.body.codigo).toBe('actividad_no_encontrada')

    const respuestaInexistente = await request(app)
      .get('/api/actividades/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookieAjena)
    expect(respuestaInexistente.status).toBe(404)
    expect(respuestaInexistente.body.codigo).toBe('actividad_no_encontrada')
  })

  it('responde 404 a un participante cuya membresía fue desactivada', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)
    await prisma.membresia.updateMany({
      where: { idActividad: id, rol: 'participante' },
      data: { estado: 'desactivada' },
    })

    const respuesta = await request(app)
      .get(`/api/actividades/${id}`)
      .set('Cookie', cookieParticipante)

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('actividad_no_encontrada')
  })

  it('un participante no obtiene ninguna capacidad de este catálogo', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await request(app)
      .get(`/api/actividades/${id}`)
      .set('Cookie', cookieParticipante)
    expect(respuesta.status).toBe(200)
    expect(respuesta.body.actividad.capacidades).toEqual([])
  })
})

describe('GET /api/actividades/:id/participantes', () => {
  it('devuelve solo a los participantes activos, con su membresía y fecha de unión, sin quien organiza', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieUno = await registrarYObtenerCookie('grace@ejemplo.com')
    const cookieDos = await registrarYObtenerCookie('linus@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieUno)
    await unirseComoParticipante(claveIngreso, cookieDos)

    const respuesta = await request(app)
      .get(`/api/actividades/${id}/participantes`)
      .set('Cookie', cookieOrganizador)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.participantes).toHaveLength(2)
    for (const participante of respuesta.body.participantes) {
      expect(participante).toMatchObject({ nombre: 'Ada Lovelace', rol: 'participante' })
      expect(participante.idMembresia).toEqual(expect.any(String))
      // Instante real (ISO completo): el cliente lo formatea con formatearFechaHora.
      expect(new Date(participante.fechaUnion).toISOString()).toBe(participante.fechaUnion)
    }
    const fechas = respuesta.body.participantes.map((p: { fechaUnion: string }) => p.fechaUnion)
    expect([...fechas].sort()).toEqual(fechas)
  })

  it('no incluye a un participante cuya membresía fue desactivada', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)
    await prisma.membresia.updateMany({
      where: { idActividad: id, rol: 'participante' },
      data: { estado: 'desactivada' },
    })

    const respuesta = await request(app)
      .get(`/api/actividades/${id}/participantes`)
      .set('Cookie', cookieOrganizador)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.participantes).toEqual([])
  })

  it('es visible para un participante, no solo para el organizador', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await request(app)
      .get(`/api/actividades/${id}/participantes`)
      .set('Cookie', cookieParticipante)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.participantes).toHaveLength(1)
  })

  it('responde 404 a quien no es miembro', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieAjena = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .get(`/api/actividades/${id}/participantes`)
      .set('Cookie', cookieAjena)
    expect(respuesta.status).toBe(404)
  })
})

describe('PUT /api/actividades/:id/configuracion/:funcion', () => {
  it('el organizador cambia el estado de una función simple', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/configuracion/bitacora_individual`)
      .set('Cookie', cookieOrganizador)
      .send({ estado: 'habilitada' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.actividad.configuracion.bitacora_individual).toBe('habilitada')
  })

  it('el organizador cambia el estado compuesto de espacio_equipo', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/configuracion/espacio_equipo`)
      .set('Cookie', cookieOrganizador)
      .send({ metas: 'obligatorio', avances: 'opcional', recursos: 'obligatorio' })

    expect(respuesta.status).toBe(200)
    expect(JSON.parse(respuesta.body.actividad.configuracion.espacio_equipo)).toEqual({
      metas: 'obligatorio',
      avances: 'opcional',
      recursos: 'obligatorio',
    })
  })

  it('rechaza un estado que no pertenece al catálogo de la función', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/configuracion/bitacora_individual`)
      .set('Cookie', cookieOrganizador)
      .send({ estado: 'valor_inventado' })

    expect(respuesta.status).toBe(400)
  })

  it('rechaza una función que no existe en el catálogo', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/configuracion/funcion_inventada`)
      .set('Cookie', cookieOrganizador)
      .send({ estado: 'habilitada' })

    expect(respuesta.status).toBe(400)
  })

  it('responde 403 a un participante', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/configuracion/bitacora_individual`)
      .set('Cookie', cookieParticipante)
      .send({ estado: 'habilitada' })

    expect(respuesta.status).toBe(403)
    expect(respuesta.body.codigo).toBe('accion_no_permitida')
  })
})

describe('POST /api/actividades/:id/inscripcion/cierre', () => {
  it('cierra la inscripción con al menos un participante y la clave deja de admitir uniones', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await request(app)
      .post(`/api/actividades/${id}/inscripcion/cierre`)
      .set('Cookie', cookieOrganizador)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.actividad.fase).toBe('formacion_equipos')
    const actividadEnBD = await prisma.actividad.findUniqueOrThrow({ where: { idActividad: id } })
    expect(actividadEnBD.estado).toBe('formacion_equipos')

    const cookieTardio = await registrarYObtenerCookie('lovelace@ejemplo.com')
    const respuestaUnion = await request(app)
      .post(`/api/claves/${claveIngreso}/union`)
      .set('Cookie', cookieTardio)
    expect(respuestaUnion.status).toBe(404)
  })

  it('rechaza con 422 si no hay ningún participante', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .post(`/api/actividades/${id}/inscripcion/cierre`)
      .set('Cookie', cookieOrganizador)

    expect(respuesta.status).toBe(422)
    expect(respuesta.body.codigo).toBe('sin_participantes')

    const actividadEnBD = await prisma.actividad.findUniqueOrThrow({ where: { idActividad: id } })
    expect(actividadEnBD.estado).toBe('inscripcion')
  })

  it('responde 403 a un participante que intenta cerrarla', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuesta = await request(app)
      .post(`/api/actividades/${id}/inscripcion/cierre`)
      .set('Cookie', cookieParticipante)

    expect(respuesta.status).toBe(403)
  })

  it('responde 409 si ya no está en inscripción', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    await request(app)
      .post(`/api/actividades/${id}/inscripcion/cierre`)
      .set('Cookie', cookieOrganizador)
    const segundoIntento = await request(app)
      .post(`/api/actividades/${id}/inscripcion/cierre`)
      .set('Cookie', cookieOrganizador)

    expect(segundoIntento.status).toBe(409)
    expect(segundoIntento.body.codigo).toBe('fase_no_permite_accion')
  })

  it('registra un evento de historial con el actor de tipo usuario', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    await request(app)
      .post(`/api/actividades/${id}/inscripcion/cierre`)
      .set('Cookie', cookieOrganizador)

    const eventos = await prisma.historial.findMany({
      where: { idActividad: id, tipoEvento: 'fase_avanzada' },
    })
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ tipoActor: 'usuario', categoria: 'estructura' })
  })

  it('una unión que llega mientras se cierra la inscripción no crea una membresía tardía', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const cookieTardio = await registrarYObtenerCookie('lovelace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    // Un cierre a medio commit: la actividad ya cambió de estado dentro de su
    // transacción, pero otra conexión todavía la ve en inscripción.
    let terminarCierre!: () => void
    let cierreEscrito!: () => void
    const escrito = new Promise<void>((resolver) => (cierreEscrito = resolver))
    const cierre = prisma.$transaction(async (tx) => {
      await tx.actividad.update({
        where: { idActividad: id },
        data: { estado: 'formacion_equipos' },
      })
      cierreEscrito()
      await new Promise<void>((resolver) => (terminarCierre = resolver))
    })
    await escrito

    const union = request(app)
      .post(`/api/claves/${claveIngreso}/union`)
      .set('Cookie', cookieTardio)
      .then((respuesta) => respuesta)
    await new Promise((resolver) => setTimeout(resolver, 200))
    terminarCierre()
    await cierre
    const respuestaUnion = await union

    expect(respuestaUnion.status).toBe(404)
    const participantes = await prisma.membresia.count({
      where: { idActividad: id, rol: 'participante' },
    })
    expect(participantes).toBe(1)
  })

  it('dos cierres simultáneos ejecutan la transición una sola vez', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const respuestas = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post(`/api/actividades/${id}/inscripcion/cierre`)
          .set('Cookie', cookieOrganizador),
      ),
    )

    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409])
    const eventos = await prisma.historial.findMany({
      where: { idActividad: id, tipoEvento: 'fase_avanzada' },
    })
    expect(eventos).toHaveLength(1)
  })
})

describe('PUT /api/actividades/:id/coorganizadores/:idUsuario', () => {
  it('agrega a un usuario sin membresía previa como co-organizador con el conjunto de permisos por defecto', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieObjetivo = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuestaSesion = await request(app).get('/api/sesion').set('Cookie', cookieObjetivo)
    const idUsuarioObjetivo = respuestaSesion.body.usuario.idUsuario

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/coorganizadores/${idUsuarioObjetivo}`)
      .set('Cookie', cookieOrganizador)
      .send({})

    expect(respuesta.status).toBe(200)

    const membresia = await prisma.membresia.findFirstOrThrow({
      where: { idActividad: id, idUsuario: idUsuarioObjetivo },
      include: { permisos: true },
    })
    expect(membresia.rol).toBe('co_organizador')
    expect(membresia.permisos.map((p) => p.permiso).sort()).toEqual(
      [
        'configurar_actividad',
        'gestionar_inscripcion',
        'gestionar_equipos',
        'calificar_y_comentar',
        'leer_bitacoras',
        'otorgar_insignias',
        'desactivar_participantes',
        'consultar_historial_completo',
      ].sort(),
    )
  })

  it('trata un permiso repetido en la petición como un solo permiso', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieObjetivo = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)
    const respuestaSesion = await request(app).get('/api/sesion').set('Cookie', cookieObjetivo)
    const idUsuarioObjetivo = respuestaSesion.body.usuario.idUsuario

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/coorganizadores/${idUsuarioObjetivo}`)
      .set('Cookie', cookieOrganizador)
      .send({ permisos: ['leer_bitacoras', 'leer_bitacoras', 'otorgar_insignias'] })

    expect(respuesta.status).toBe(200)
    const membresia = await prisma.membresia.findFirstOrThrow({
      where: { idActividad: id, idUsuario: idUsuarioObjetivo },
      include: { permisos: true },
    })
    expect(membresia.permisos.map((p) => p.permiso).sort()).toEqual([
      'leer_bitacoras',
      'otorgar_insignias',
    ])
  })

  it('promueve a un participante existente y respeta un conjunto de permisos explícito', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieObjetivo = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieObjetivo)

    const respuestaSesion = await request(app).get('/api/sesion').set('Cookie', cookieObjetivo)
    const idUsuarioObjetivo = respuestaSesion.body.usuario.idUsuario

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/coorganizadores/${idUsuarioObjetivo}`)
      .set('Cookie', cookieOrganizador)
      .send({ permisos: ['gestionar_inscripcion'] })

    expect(respuesta.status).toBe(200)

    const membresia = await prisma.membresia.findFirstOrThrow({
      where: { idActividad: id, idUsuario: idUsuarioObjetivo },
      include: { permisos: true },
    })
    expect(membresia.rol).toBe('co_organizador')
    expect(membresia.permisos.map((p) => p.permiso)).toEqual(['gestionar_inscripcion'])
  })

  it('rechaza con 422 promover al organizador mismo', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuestaSesion = await request(app).get('/api/sesion').set('Cookie', cookieOrganizador)
    const idOrganizador = respuestaSesion.body.usuario.idUsuario

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/coorganizadores/${idOrganizador}`)
      .set('Cookie', cookieOrganizador)
      .send({})

    expect(respuesta.status).toBe(422)
    expect(respuesta.body.codigo).toBe('organizador_unico')
  })

  it('responde 404 si el usuario objetivo no existe', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const respuesta = await request(app)
      .put(`/api/actividades/${id}/coorganizadores/00000000-0000-0000-0000-000000000000`)
      .set('Cookie', cookieOrganizador)
      .send({})

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.codigo).toBe('usuario_no_encontrado')
  })
})

// Dos días después del límite de inscripción de DATOS_ACTIVIDAD, en el pasado
// de la tarea programada y con margen de sobra sobre el final del día en CDMX.
function despuesDelLimite(): Date {
  return new Date(
    new Date(`${DATOS_ACTIVIDAD.fechaLimiteInscripcion}T00:00:00.000Z`).getTime() + 2 * UN_DIA_MS,
  )
}

describe('transicionarActividadesVencidas (tarea programada, nucleo §7.5)', () => {
  it('transiciona una actividad con la fecha de inscripción vencida y al menos un participante', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    // Un instante bien entrado el día siguiente a fechaLimiteInscripcion en
    // CDMX ya venció.
    const resultado = await transicionarActividadesVencidas(despuesDelLimite())

    expect(resultado.procesadas).toBe(1)
    expect(resultado.omitidasPorSinParticipantes).toBe(0)
    const actividadEnBD = await prisma.actividad.findUniqueOrThrow({ where: { idActividad: id } })
    expect(actividadEnBD.estado).toBe('formacion_equipos')

    const eventos = await prisma.historial.findMany({
      where: { idActividad: id, tipoEvento: 'fase_avanzada' },
    })
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ tipoActor: 'sistema', idUsuarioActor: null })
  })

  it('no transiciona antes de que venza la fecha', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    const { id, claveIngreso } = await crearActividad(cookieOrganizador)
    await unirseComoParticipante(claveIngreso, cookieParticipante)

    const resultado = await transicionarActividadesVencidas(new Date())

    expect(resultado.procesadas).toBe(0)
    const actividadEnBD = await prisma.actividad.findUniqueOrThrow({ where: { idActividad: id } })
    expect(actividadEnBD.estado).toBe('inscripcion')
  })

  it('caso límite: fecha vencida sin ningún participante no transiciona', async () => {
    const cookieOrganizador = await registrarYObtenerCookie('ada@ejemplo.com')
    const { id } = await crearActividad(cookieOrganizador)

    const resultado = await transicionarActividadesVencidas(despuesDelLimite())

    expect(resultado.procesadas).toBe(0)
    expect(resultado.omitidasPorSinParticipantes).toBe(1)
    const actividadEnBD = await prisma.actividad.findUniqueOrThrow({ where: { idActividad: id } })
    expect(actividadEnBD.estado).toBe('inscripcion')
  })
})

describe('PUT /api/actividades/:id/configuracion/:funcion durante el desarrollo y el cierre', () => {
  async function actividadEn(
    estado: 'desarrollo' | 'cierre' | 'archivada',
    correo = 'ada@ejemplo.com',
  ) {
    const cookie = await registrarYObtenerCookie(correo)
    const { id } = await crearActividad(cookie)
    await prisma.actividad.update({ where: { idActividad: id }, data: { estado } })
    return { cookie, id }
  }

  const configurar = (id: string, cookie: string, funcion: string, cuerpo: object) =>
    request(app)
      .put(`/api/actividades/${id}/configuracion/${funcion}`)
      .set('Cookie', cookie)
      .send(cuerpo)

  it('se puede habilitar una función y volver a deshabilitarla si no tiene datos', async () => {
    for (const estado of ['desarrollo', 'cierre'] as const) {
      const { cookie, id } = await actividadEn(estado, `${estado}@ejemplo.com`)

      const habilitar = await configurar(id, cookie, 'bitacora_individual', {
        estado: 'habilitada',
      })
      expect(habilitar.status, estado).toBe(200)
      expect(habilitar.body.actividad.configuracion.bitacora_individual).toBe('habilitada')

      const deshabilitar = await configurar(id, cookie, 'bitacora_individual', {
        estado: 'deshabilitada',
      })
      expect(deshabilitar.status, estado).toBe(200)

      const cambios = await prisma.historial.findMany({
        where: { idActividad: id, tipoEvento: 'configuracion_modificada' },
        orderBy: { fecha: 'asc' },
      })
      expect(cambios.map((c) => c.datos)).toEqual([
        {
          funcion: 'bitacora_individual',
          estadoAnterior: 'deshabilitada',
          estadoNuevo: 'habilitada',
        },
        {
          funcion: 'bitacora_individual',
          estadoAnterior: 'habilitada',
          estadoNuevo: 'deshabilitada',
        },
      ])
    }
  })

  it('el espacio de equipo también cambia por elemento sin datos', async () => {
    const { cookie, id } = await actividadEn('desarrollo')
    const respuesta = await configurar(id, cookie, 'espacio_equipo', {
      metas: 'obligatorio',
      avances: 'deshabilitado',
      recursos: 'opcional',
    })
    expect(respuesta.status).toBe(200)
  })

  it('la formación de equipos ya cerrada no cambia, con explicación: 422', async () => {
    const { cookie, id } = await actividadEn('desarrollo')
    const respuesta = await configurar(id, cookie, 'formacion_equipos', { estado: 'manual' })
    expect(respuesta.status).toBe(422)
    expect(respuesta.body.codigo).toBe('funcion_con_datos')
    expect(respuesta.body.mensaje).toMatch(/formación de equipos ya se cerró/)
    const actividad = await request(app).get(`/api/actividades/${id}`).set('Cookie', cookie)
    expect(actividad.body.actividad.configuracion.formacion_equipos).toBe('autogestionado')
  })

  it('las insignias pueden habilitarse, pero no deshabilitarse mientras no se pueda comprobar que no hay otorgamientos', async () => {
    const { cookie, id } = await actividadEn('cierre')
    expect((await configurar(id, cookie, 'insignias', { estado: 'solo_organizador' })).status).toBe(
      200,
    )
    const deshabilitar = await configurar(id, cookie, 'insignias', { estado: 'deshabilitado' })
    expect(deshabilitar.status).toBe(422)
    expect(deshabilitar.body.codigo).toBe('funcion_con_datos')
  })

  it('un cambio rechazado no escribe ni registra evento', async () => {
    const { cookie, id } = await actividadEn('desarrollo')
    await configurar(id, cookie, 'formacion_equipos', { estado: 'manual' })
    expect(
      await prisma.historial.count({
        where: { idActividad: id, tipoEvento: 'configuracion_modificada' },
      }),
    ).toBe(0)
  })

  it('en una actividad archivada sigue siendo de solo lectura: 409', async () => {
    const { cookie, id } = await actividadEn('archivada')
    expect(
      (await configurar(id, cookie, 'bitacora_individual', { estado: 'habilitada' })).status,
    ).toBe(409)
  })

  it('un participante no puede: 403; y las capacidades incluyen ajustar_funciones para quien organiza', async () => {
    const { cookie, id } = await actividadEn('desarrollo')
    const cookieParticipante = await registrarYObtenerCookie('grace@ejemplo.com')
    await prisma.membresia.create({
      data: {
        idActividad: id,
        idUsuario: (await request(app).get('/api/sesion').set('Cookie', cookieParticipante)).body
          .usuario.idUsuario,
        rol: 'participante',
      },
    })

    expect(
      (await configurar(id, cookieParticipante, 'bitacora_individual', { estado: 'habilitada' }))
        .status,
    ).toBe(403)
    const detalle = await request(app).get(`/api/actividades/${id}`).set('Cookie', cookie)
    expect(detalle.body.actividad.capacidades).toContain('ajustar_funciones')
    expect(detalle.body.actividad.capacidades).not.toContain('configurar_funciones')
  })
})
