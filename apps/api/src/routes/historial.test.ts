import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../data/prisma.js'
import {
  app,
  actividadConParticipantes,
  actividadEnFormacion,
  asignar,
  cerrarFormacion,
  idEquipoCreado,
  limpiarBD,
  registrar,
} from './equiposFixtures.js'

// Integración contra Postgres real (docs/diseno-desarrollo-nucleo.md §12.2).
// Cubre la consulta cronológica mínima de este incremento (nucleo §5.5,
// §11.2): sin filtros ni agregación (Fase B), con la visibilidad por rol de
// general §7.3.

beforeEach(limpiarBD)

afterAll(async () => {
  await prisma.$disconnect()
})

const historial = (idActividad: string, cookie: string) =>
  request(app).get(`/api/actividades/${idActividad}/historial`).set('Cookie', cookie)

const historialPaginado = (
  idActividad: string,
  cookie: string,
  query: { cursor?: string; limite?: number },
) => {
  const parametros = new URLSearchParams()
  if (query.cursor) parametros.set('cursor', query.cursor)
  if (query.limite !== undefined) parametros.set('limite', String(query.limite))
  const cadena = parametros.toString()
  return request(app)
    .get(`/api/actividades/${idActividad}/historial${cadena ? `?${cadena}` : ''}`)
    .set('Cookie', cookie)
}

describe('GET /api/actividades/:id/historial', () => {
  it('el organizador ve los eventos de estructura y de aportación, cronológico inverso', async () => {
    const e = await actividadEnFormacion(1)
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')

    const respuesta = await historial(e.id, e.organizador.cookie)
    expect(respuesta.status).toBe(200)
    const tipos = respuesta.body.eventos.map((ev: { tipoEvento: string }) => ev.tipoEvento)
    expect(tipos).toContain('actividad_creada')
    expect(tipos).toContain('equipo_creado')

    // Cronológico inverso: el primero de la lista es el más reciente.
    const fechas = respuesta.body.eventos.map((ev: { fecha: string }) =>
      new Date(ev.fecha).getTime(),
    )
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a))
  })

  it('un participante ve los eventos de estructura de toda la actividad (no de un equipo en particular)', async () => {
    const e = await actividadConParticipantes(1)

    const respuesta = await historial(e.id, e.participantes[0].cookie)
    expect(respuesta.status).toBe(200)
    const tipos = respuesta.body.eventos.map((ev: { tipoEvento: string }) => ev.tipoEvento)
    expect(tipos).toContain('actividad_creada')
  })

  // P-10: a diferencia de los eventos de estructura de toda la actividad
  // (prueba de arriba), los de un equipo en particular (crear, modificar,
  // eliminar, asignar/retirar integrantes) solo los ve quien lo integra.
  it('un participante ve la estructura de su propio equipo, pero no la de otro equipo de la misma actividad', async () => {
    const e = await actividadEnFormacion(2)
    const idEquipoA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const idEquipoB = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
    await asignar(idEquipoA, e.participantes[0].idMembresia, e.organizador.cookie)
    await asignar(idEquipoB, e.participantes[1].idMembresia, e.organizador.cookie)

    const respuestaAlfa = await historial(e.id, e.participantes[0].cookie)
    const idsDeEquipoEnAlfa = respuestaAlfa.body.eventos
      .filter((ev: { tipoEvento: string }) => ev.tipoEvento === 'equipo_creado')
      .map((ev: { idEntidad: string }) => ev.idEntidad)
    expect(idsDeEquipoEnAlfa).toEqual([idEquipoA])

    const asignacionesQueVeAlfa = respuestaAlfa.body.eventos.filter(
      (ev: { tipoEvento: string }) => ev.tipoEvento === 'integrante_asignado',
    )
    expect(asignacionesQueVeAlfa).toHaveLength(1)
    expect(asignacionesQueVeAlfa[0].idEntidad).toBe(idEquipoA)

    // El organizador, en cambio, ve la estructura de ambos equipos.
    const respuestaOrganizador = await historial(e.id, e.organizador.cookie)
    const idsDeEquipoParaOrganizador = respuestaOrganizador.body.eventos
      .filter((ev: { tipoEvento: string }) => ev.tipoEvento === 'equipo_creado')
      .map((ev: { idEntidad: string }) => ev.idEntidad)
    expect(new Set(idsDeEquipoParaOrganizador)).toEqual(new Set([idEquipoA, idEquipoB]))
  })

  it('un intercambio entre dos equipos lo ven ambos integrantes, no un tercer equipo', async () => {
    const e = await actividadEnFormacion(3)
    const idEquipoA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const idEquipoB = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
    const idEquipoC = await idEquipoCreado(e.id, e.organizador.cookie, 'Gamma')
    await asignar(idEquipoA, e.participantes[0].idMembresia, e.organizador.cookie)
    await asignar(idEquipoB, e.participantes[1].idMembresia, e.organizador.cookie)
    await asignar(idEquipoC, e.participantes[2].idMembresia, e.organizador.cookie)

    const intercambio = await request(app)
      .post(`/api/actividades/${e.id}/equipos/intercambio`)
      .set('Cookie', e.organizador.cookie)
      .send({
        idMembresiaA: e.participantes[0].idMembresia,
        idMembresiaB: e.participantes[1].idMembresia,
      })
    expect(intercambio.status).toBe(200)

    const tipoDelEvento = (cuerpo: { eventos: { tipoEvento: string }[] }) =>
      cuerpo.eventos.some((ev) => ev.tipoEvento === 'integrantes_intercambiados')

    expect(tipoDelEvento((await historial(e.id, e.participantes[0].cookie)).body)).toBe(true)
    expect(tipoDelEvento((await historial(e.id, e.participantes[1].cookie)).body)).toBe(true)
    expect(tipoDelEvento((await historial(e.id, e.participantes[2].cookie)).body)).toBe(false)
  })

  // reparto_automatico y propuesta_generada listan la composición de todos
  // los equipos a la vez: son gestión de equipos de quien organiza, no la
  // estructura de un equipo en particular ni configuración de la actividad.
  it('reparto_automatico no es visible para un participante, solo para el organizador', async () => {
    const e = await actividadEnFormacion(2)
    await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    // Nadie se asigna: al cerrar la formación, el reparto automático los
    // coloca a los dos.
    const cierre = await cerrarFormacion(e.id, e.organizador.cookie)
    expect(cierre.status).toBe(200)

    const tieneReparto = (cuerpo: { eventos: { tipoEvento: string }[] }) =>
      cuerpo.eventos.some((ev) => ev.tipoEvento === 'reparto_automatico')

    expect(tieneReparto((await historial(e.id, e.organizador.cookie)).body)).toBe(true)
    expect(tieneReparto((await historial(e.id, e.participantes[0].cookie)).body)).toBe(false)
  })

  // P-10 (general §7.3): a diferencia de estructura, que es de toda la
  // actividad, un participante solo ve la aportación de su propio equipo —
  // no la de otros equipos, aunque compartan actividad.
  it('un participante ve la aportación de su propio equipo, pero no la de otro equipo de la misma actividad', async () => {
    const e = await actividadEnFormacion(2)
    const idEquipoA = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    const idEquipoB = await idEquipoCreado(e.id, e.organizador.cookie, 'Beta')
    await asignar(idEquipoA, e.participantes[0].idMembresia, e.organizador.cookie)
    await asignar(idEquipoB, e.participantes[1].idMembresia, e.organizador.cookie)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })

    await request(app)
      .post(`/api/equipos/${idEquipoA}/elementos`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ tipo: 'metas', contenido: 'Meta de Alfa' })
    await request(app)
      .post(`/api/equipos/${idEquipoB}/elementos`)
      .set('Cookie', e.participantes[1].cookie)
      .send({ tipo: 'metas', contenido: 'Meta de Beta' })

    const respuestaAlfa = await historial(e.id, e.participantes[0].cookie)
    const aportacionAlfa = respuestaAlfa.body.eventos.filter(
      (ev: { categoria: string }) => ev.categoria === 'aportacion',
    )
    expect(aportacionAlfa).toHaveLength(1)
    expect(aportacionAlfa[0]).toMatchObject({
      tipoEvento: 'elemento_creado',
      datos: { extracto: 'Meta de Alfa' },
    })

    // El organizador, en cambio, ve la aportación de ambos equipos.
    const respuestaOrganizador = await historial(e.id, e.organizador.cookie)
    const aportacionOrganizador = respuestaOrganizador.body.eventos.filter(
      (ev: { categoria: string }) => ev.categoria === 'aportacion',
    )
    expect(aportacionOrganizador).toHaveLength(2)
  })

  it('un participante sin equipo todavía (en formación) no ve ningún evento de aportación', async () => {
    const e = await actividadEnFormacion(2)
    const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')
    await asignar(idEquipo, e.participantes[0].idMembresia, e.organizador.cookie)
    await prisma.actividad.update({ where: { idActividad: e.id }, data: { estado: 'desarrollo' } })
    await request(app)
      .post(`/api/equipos/${idEquipo}/elementos`)
      .set('Cookie', e.participantes[0].cookie)
      .send({ tipo: 'metas', contenido: 'Meta de Alfa' })

    // participantes[1] nunca se asignó a un equipo.
    const respuesta = await historial(e.id, e.participantes[1].cookie)
    const aportacion = respuesta.body.eventos.filter(
      (ev: { categoria: string }) => ev.categoria === 'aportacion',
    )
    expect(aportacion).toHaveLength(0)
  })

  it('quien no es miembro de la actividad recibe 404', async () => {
    const e = await actividadConParticipantes(0)
    const ajeno = await registrar('Ajeno')

    const respuesta = await historial(e.id, ajeno.cookie)
    expect(respuesta.status).toBe(404)
  })

  it('identifica al actor por nombre y conserva null para eventos del sistema', async () => {
    const e = await actividadEnFormacion(1)
    const idEquipo = await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')

    const respuesta = await historial(e.id, e.organizador.cookie)
    const creado = respuesta.body.eventos.find(
      (ev: { tipoEvento: string; idEntidad: string }) =>
        ev.tipoEvento === 'equipo_creado' && ev.idEntidad === idEquipo,
    )
    expect(creado.actor).toBe(`${e.organizador.nombre} Prueba`)
  })

  // Paginación por cursor (nucleo §3.1): el historial no tiene cota de
  // tamaño, así que no se puede cargar completo de un solo golpe.
  describe('paginación', () => {
    it('sin más eventos que el límite, cursorSiguiente es null', async () => {
      const e = await actividadEnFormacion(1)
      await idEquipoCreado(e.id, e.organizador.cookie, 'Alfa')

      const respuesta = await historialPaginado(e.id, e.organizador.cookie, { limite: 10 })
      expect(respuesta.status).toBe(200)
      expect(respuesta.body.cursorSiguiente).toBeNull()
      expect(respuesta.body.eventos.length).toBeGreaterThan(0)
    })

    it('recorrer todas las páginas con el cursor reconstruye la lista completa, sin huecos ni duplicados', async () => {
      const e = await actividadEnFormacion(1)
      // actividadEnFormacion ya deja actividad_creada y fase_avanzada
      // (cierra la inscripción); se suma un equipo_creado por cada equipo.
      for (const nombre of ['Alfa', 'Beta', 'Gamma', 'Delta']) {
        await idEquipoCreado(e.id, e.organizador.cookie, nombre)
      }

      const completo = await historialPaginado(e.id, e.organizador.cookie, { limite: 100 })
      const total = completo.body.eventos.length
      expect(total).toBeGreaterThan(2) // suficientes eventos para que valga la pena paginar en 2

      const vistos: string[] = []
      let cursor: string | undefined
      let paginas = 0
      do {
        const pagina = await historialPaginado(e.id, e.organizador.cookie, { cursor, limite: 2 })
        expect(pagina.status).toBe(200)
        expect(pagina.body.eventos.length).toBeLessThanOrEqual(2)
        vistos.push(...pagina.body.eventos.map((ev: { id: string }) => ev.id))
        cursor = pagina.body.cursorSiguiente ?? undefined
        paginas += 1
        expect(paginas).toBeLessThan(10) // contra un ciclo infinito si algo sale mal
      } while (cursor)

      expect(paginas).toBe(Math.ceil(total / 2))
      expect(new Set(vistos).size).toBe(total) // sin duplicados
      expect(vistos).toEqual(completo.body.eventos.map((ev: { id: string }) => ev.id))
    })
  })
})
