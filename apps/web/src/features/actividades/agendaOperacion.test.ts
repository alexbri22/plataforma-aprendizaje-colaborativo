import type {
  AvanceDeInstrumento,
  ElementoConCalendario,
  EntregasDePeriodo,
  InstrumentoPorResponder,
  PeriodoReporte,
} from '@plataforma/shared'
import { describe, expect, it } from 'vitest'
import {
  construirAgenda,
  grupoDeEntrada,
  hoyEnCalendario,
  type DatosAgenda,
  type EntradaAgenda,
} from './agendaOperacion'
import type { Actividad } from './tipos'

const HOY = '2026-11-12'

function actividad(sobrescribir: Partial<Actividad> = {}): Actividad {
  return {
    id: 'a1',
    nombre: 'Taller',
    objetivo: '',
    fase: 'desarrollo',
    rol: 'organizador',
    numParticipantes: 6,
    fechaClave: '',
    nombreOrganizador: 'Ana',
    fechaInicio: '2026-10-01',
    fechaTermino: '2026-11-30',
    fechaLimiteInscripcion: '2026-09-25',
    configuracion: {},
    ...sobrescribir,
  }
}

function periodo(
  orden: number,
  fechaInicio: string,
  fechaFin: string,
  elemento: ElementoConCalendario = 'avances',
): PeriodoReporte {
  return { id: `p${orden}`, elemento, orden, fechaInicio, fechaFin, estado: 'activo' }
}

function entregas(
  idPeriodo: string,
  hechos: number,
  total: number,
  mio: boolean | null = null,
  unidad: EntregasDePeriodo['unidad'] = 'equipos',
): EntregasDePeriodo {
  return { idPeriodo, hechos, total, unidad, mio }
}

const TODO_HABILITADO = new Set<ElementoConCalendario>([
  'metas',
  'planeacion',
  'avances',
  'recursos',
  'producto',
  'bitacora',
])

function datos(sobrescribir: Partial<DatosAgenda> = {}): DatosAgenda {
  return {
    actividad: actividad(),
    hoy: HOY,
    periodos: [],
    entregas: [],
    habilitados: TODO_HABILITADO,
    calificacionHabilitada: true,
    ...sobrescribir,
  }
}

function entrada(sobrescribir: Partial<EntradaAgenda>): EntradaAgenda {
  return { clave: 'x', titulo: 'X', desde: HOY, hasta: HOY, ...sobrescribir }
}

describe('grupoDeEntrada', () => {
  it('ubica cada entrada por cuándo toca respecto de hoy', () => {
    expect(grupoDeEntrada(entrada({}), HOY)).toBe('hoy')
    // Un periodo que empezó y no ha terminado es de hoy.
    expect(grupoDeEntrada(entrada({ desde: '2026-11-09', hasta: '2026-11-15' }), HOY)).toBe('hoy')
    expect(grupoDeEntrada(entrada({ desde: '2026-11-19', hasta: '2026-11-19' }), HOY)).toBe(
      'semana',
    )
    expect(grupoDeEntrada(entrada({ desde: '2026-11-20', hasta: '2026-11-20' }), HOY)).toBe(
      'proximo',
    )
  })

  it('lo que pasó sin completarse está vencido; completo, ya pasó', () => {
    const ayer = { desde: '2026-11-11', hasta: '2026-11-11' }
    expect(grupoDeEntrada(entrada({ ...ayer, hecho: false }), HOY)).toBe('vencido')
    expect(grupoDeEntrada(entrada({ ...ayer, hecho: true }), HOY)).toBe('pasado')
    expect(
      grupoDeEntrada(
        entrada({ ...ayer, progreso: { hechos: 2, total: 3, unidad: 'equipos' } }),
        HOY,
      ),
    ).toBe('vencido')
    expect(
      grupoDeEntrada(
        entrada({ ...ayer, progreso: { hechos: 3, total: 3, unidad: 'equipos' } }),
        HOY,
      ),
    ).toBe('pasado')
    // Un hito (sin hecho ni progreso) no se vence: solo pasa.
    expect(grupoDeEntrada(entrada(ayer), HOY)).toBe('pasado')
  })

  it('sin fecha y pendiente queda aparte; sin fecha y hecho, ya pasó', () => {
    expect(grupoDeEntrada(entrada({ desde: null, hasta: null, hecho: false }), HOY)).toBe(
      'sinFecha',
    )
    expect(grupoDeEntrada(entrada({ desde: null, hasta: null, hecho: true }), HOY)).toBe('pasado')
  })
})

describe('construirAgenda', () => {
  it('quien organiza ve cuántos equipos entregaron cada avance y va a Equipos', () => {
    const periodos = [
      periodo(1, '2026-11-02', '2026-11-08'),
      periodo(2, '2026-11-09', '2026-11-15'),
    ]
    const agenda = construirAgenda(
      datos({ periodos, entregas: [entregas('p1', 2, 3), entregas('p2', 1, 3)] }),
    )

    expect(agenda.map((s) => s.grupo)).toEqual(['vencido', 'hoy', 'proximo', 'pasado'])
    const vencido = agenda[0].entradas[0]
    expect(vencido).toMatchObject({
      titulo: 'Avance 1',
      progreso: { hechos: 2, total: 3, unidad: 'equipos' },
      to: '/actividades/a1/equipos',
    })
    expect(agenda[1].entradas.map((e) => e.titulo)).toEqual(['Avance 2'])
  })

  it('quien participa ve si su equipo ya entregó y va a sus avances', () => {
    const agenda = construirAgenda(
      datos({
        actividad: actividad({ rol: 'participante', idMiEquipo: 'e1' }),
        periodos: [periodo(1, '2026-11-09', '2026-11-15')],
        entregas: [entregas('p1', 1, 3, true)],
      }),
    )
    const hoy = agenda.find((s) => s.grupo === 'hoy')!
    expect(hoy.entradas[0]).toMatchObject({ hecho: true, to: '/equipos/e1/avances' })
    expect(hoy.entradas[0].progreso).toBeUndefined()
  })

  it('omite los periodos cancelados y, sin avances habilitados, todos', () => {
    const cancelado = { ...periodo(1, '2026-11-09', '2026-11-15'), estado: 'cancelado' as const }
    const conCancelado = construirAgenda(datos({ periodos: [cancelado] }))
    expect(conCancelado.flatMap((s) => s.entradas).some((e) => e.titulo === 'Avance 1')).toBe(false)

    const sinAvances = construirAgenda(
      datos({
        periodos: [periodo(1, '2026-11-09', '2026-11-15')],
        habilitados: new Set<ElementoConCalendario>(['metas']),
      }),
    )
    expect(sinAvances.flatMap((s) => s.entradas).some((e) => e.titulo === 'Avance 1')).toBe(false)
  })

  it('los instrumentos de quien participa llevan a donde se responden; sin fecha van aparte', () => {
    const base: Omit<InstrumentoPorResponder, 'id' | 'nombre' | 'fechaPlanificada'> = {
      aspecto: { clave: 'autoevaluacion', nombre: 'Autoevaluación' },
      formato: 'plantilla',
      clavePlantilla: null,
      enlace: null,
      completadoEn: null,
    }
    const agenda = construirAgenda(
      datos({
        actividad: actividad({ rol: 'participante', idMiEquipo: 'e1' }),
        misInstrumentos: [
          { ...base, id: 'i1', nombre: 'Cuestionario 1', fechaPlanificada: '2026-11-18' },
          { ...base, id: 'i2', nombre: 'Cuestionario 2', fechaPlanificada: null },
        ],
      }),
    )
    const semana = agenda.find((s) => s.grupo === 'semana')!
    expect(semana.entradas[0]).toMatchObject({
      titulo: 'Cuestionario 1',
      detalle: 'Autoevaluación',
      hecho: false,
      to: '/equipos/e1/proceso/autoevaluacion/i1',
    })
    expect(agenda.find((s) => s.grupo === 'sinFecha')!.entradas[0].titulo).toBe('Cuestionario 2')
  })

  it('quien organiza ve cuántos participantes completaron cada instrumento', () => {
    const instrumento: AvanceDeInstrumento = {
      id: 'i1',
      nombre: 'Coevaluación',
      aspecto: { clave: 'pares', nombre: 'Evaluación por pares' },
      fechaPlanificada: '2026-11-25',
      completados: 4,
      total: 6,
    }
    const agenda = construirAgenda(datos({ instrumentosOrganiza: [instrumento] }))
    const proximo = agenda.find((s) => s.grupo === 'proximo')!
    expect(proximo.entradas.find((e) => e.titulo === 'Coevaluación')).toMatchObject({
      progreso: { hechos: 4, total: 6, unidad: 'participantes' },
      to: '/actividades/a1/calificaciones',
    })
  })

  it('los hitos de la actividad: la inscripción solo antes del desarrollo', () => {
    const titulos = (a: Actividad) =>
      construirAgenda(datos({ actividad: a }))
        .flatMap((s) => s.entradas)
        .map((e) => e.titulo)
    expect(titulos(actividad())).toEqual(['Termina la actividad', 'Empieza la actividad'])
    expect(
      titulos(actividad({ fase: 'inscripcion', fechaLimiteInscripcion: '2026-11-14' })),
    ).toContain('Cierra la inscripción')
  })

  it('lo que ya pasó se lee de lo más reciente a lo más antiguo', () => {
    const agenda = construirAgenda(
      datos({
        periodos: [periodo(1, '2026-10-05', '2026-10-11'), periodo(2, '2026-10-12', '2026-10-18')],
        entregas: [entregas('p1', 3, 3), entregas('p2', 3, 3)],
      }),
    )
    const pasado = agenda.find((s) => s.grupo === 'pasado')!
    expect(pasado.entradas.map((e) => e.titulo)).toEqual([
      'Avance 2',
      'Avance 1',
      'Empieza la actividad',
    ])
  })
})

describe('calendarios de cada elemento', () => {
  it('nombra cada revisión por su elemento y la bitácora se cuenta por participante', () => {
    const agenda = construirAgenda(
      datos({
        periodos: [
          periodo(1, '2026-11-09', '2026-11-15', 'metas'),
          periodo(2, '2026-11-09', '2026-11-15', 'bitacora'),
        ],
        entregas: [entregas('p1', 1, 2), entregas('p2', 4, 6, null, 'participantes')],
      }),
    )
    const hoy = agenda.find((s) => s.grupo === 'hoy')!.entradas
    expect(hoy.map((e) => [e.titulo, e.progreso])).toEqual([
      ['Revisión de metas 1', { hechos: 1, total: 2, unidad: 'equipos' }],
      ['Revisión de bitácora 2', { hechos: 4, total: 6, unidad: 'participantes' }],
    ])
  })

  it('quien participa va a la sección de ese elemento en su equipo', () => {
    const agenda = construirAgenda(
      datos({
        actividad: actividad({ rol: 'participante', idMiEquipo: 'e1' }),
        periodos: [periodo(1, '2026-11-09', '2026-11-15', 'bitacora')],
        entregas: [entregas('p1', 1, 6, false, 'participantes')],
      }),
    )
    expect(agenda.find((s) => s.grupo === 'hoy')!.entradas[0]).toMatchObject({
      hecho: false,
      to: '/equipos/e1/bitacora',
    })
  })
})

describe('hoyEnCalendario', () => {
  it('usa el día local, sin correrse por UTC', () => {
    expect(hoyEnCalendario(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12')
  })
})
