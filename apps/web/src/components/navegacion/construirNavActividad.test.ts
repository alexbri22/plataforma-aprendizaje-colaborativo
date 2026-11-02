import type { Equipo } from '@plataforma/shared'
import { describe, expect, it } from 'vitest'
import type { Actividad } from '../../features/actividades'
import {
  construirNavActividad,
  type EntradaNavActividad,
  type NavActividad,
} from './construirNavActividad'

function actividad(sobrescribir: Partial<Actividad> = {}): Actividad {
  return {
    id: 'a1',
    nombre: 'Taller de ecología',
    objetivo: '',
    fase: 'desarrollo',
    rol: 'organizador',
    numParticipantes: 4,
    fechaClave: '',
    nombreOrganizador: 'Ana',
    capacidades: ['ajustar_periodos'],
    configuracion: {},
    ...sobrescribir,
  }
}

const EQUIPO: Equipo = {
  id: 'e1',
  nombre: 'Alfa',
  descripcionActividad: null,
  formaDeTrabajo: null,
  integrantes: [{ idMembresia: 'm1', idUsuario: 'u1', nombre: 'Luis Pérez', rol: 'participante' }],
}

// Etiquetas de cada sección, con los grupos aplanados como "Grupo › Ítem".
function etiquetas(nav: NavActividad) {
  return nav.secciones.map((seccion) => ({
    titulo: seccion.titulo,
    entradas: seccion.entradas.flatMap((entrada: EntradaNavActividad) =>
      entrada.tipo === 'grupo'
        ? entrada.items.map((item) => `${entrada.etiqueta} › ${item.etiqueta}`)
        : [entrada.etiqueta],
    ),
  }))
}

function activos(nav: NavActividad) {
  return nav.secciones
    .flatMap((s) => s.entradas)
    .flatMap((e) => (e.tipo === 'grupo' ? e.items : [e]))
    .filter((i) => i.activo)
    .map((i) => i.etiqueta)
}

describe('construirNavActividad', () => {
  it('quien organiza ve la actividad con una flecha a Organizo', () => {
    const nav = construirNavActividad({
      actividad: actividad(),
      contexto: { idActividad: 'a1', seccion: 'equipos' },
    })

    expect(nav.volver).toEqual({ etiqueta: 'Organizo', to: '/actividades/organizo' })
    expect(nav.titulo).toBe('Taller de ecología')
    expect(etiquetas(nav)).toEqual([
      { titulo: undefined, entradas: ['Resumen', 'Planificar', 'Equipos', 'Participantes'] },
    ])
    expect(activos(nav)).toEqual(['Equipos'])
  })

  it('sin capacidades de planificación no ofrece Planificar', () => {
    const nav = construirNavActividad({
      actividad: actividad({ capacidades: [] }),
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    expect(etiquetas(nav)[0].entradas).not.toContain('Planificar')
  })

  it('dentro de un equipo, el equipo es un bloque con título bajo la actividad', () => {
    const nav = construirNavActividad({
      actividad: actividad({ configuracion: { bitacora_individual: 'habilitada' } }),
      equipo: EQUIPO,
      contexto: { idEquipo: 'e1', seccion: 'bitacora-integrante', idMembresia: 'm1' },
    })

    const [, bloqueEquipo] = etiquetas(nav)
    expect(bloqueEquipo.titulo).toBe('Equipo: Alfa')
    expect(bloqueEquipo.entradas).toEqual([
      'Proyecto colaborativo › Metas',
      'Proyecto colaborativo › Planeación',
      'Proyecto colaborativo › Avances',
      'Proyecto colaborativo › Materiales',
      'Proyecto colaborativo › Producto',
      'Proceso colaborativo › Definición de responsabilidades',
      'Proceso colaborativo › Interdependencia positiva',
      'Proceso colaborativo › Responsabilidad individual y grupal',
      'Proceso colaborativo › Interacción',
      'Proceso colaborativo › Evaluación de grupo y habilidades sociales',
      'Bitácoras',
    ])
    // La bitácora de alguien cuenta como estar en Bitácoras.
    expect(activos(nav)).toEqual(['Bitácoras'])
  })

  it('oculta lo deshabilitado salvo la sección en la que se está', () => {
    const espacio = JSON.stringify({ metas: 'deshabilitado', avances: 'deshabilitado' })
    const nav = construirNavActividad({
      actividad: actividad({ configuracion: { espacio_equipo: espacio } }),
      equipo: EQUIPO,
      contexto: { idEquipo: 'e1', seccion: 'metas' },
    })

    const proyecto = etiquetas(nav)[1].entradas.filter((e) => e.startsWith('Proyecto'))
    expect(proyecto).toEqual([
      'Proyecto colaborativo › Metas',
      'Proyecto colaborativo › Planeación',
      'Proyecto colaborativo › Materiales',
      'Proyecto colaborativo › Producto',
    ])
  })

  it('quien participa ve la actividad arriba y su equipo debajo, con Participo', () => {
    const nav = construirNavActividad({
      actividad: actividad({
        rol: 'participante',
        capacidades: [],
        idMiEquipo: 'e1',
        configuracion: { bitacora_individual: 'habilitada' },
      }),
      miEquipo: EQUIPO,
      ritual: { abierto: true, aplicados: false },
      contexto: { idEquipo: 'e1', seccion: 'avances' },
      equipo: EQUIPO,
    })

    expect(nav.volver.etiqueta).toBe('Participo')
    const [bloqueActividad, bloqueEquipo] = etiquetas(nav)
    expect(bloqueActividad.entradas).toEqual(['Resumen', 'Equipos', 'Participantes'])
    expect(bloqueEquipo.titulo).toBe('Mi equipo: Alfa')
    expect(bloqueEquipo.entradas).toContain('Mi bitácora')
    expect(bloqueEquipo.entradas).toContain('Reconocimientos › Reconocer al equipo')
    expect(activos(nav)).toEqual(['Avances'])
  })

  it('quien participa sin equipo solo ve el bloque de la actividad', () => {
    const nav = construirNavActividad({
      actividad: actividad({ rol: 'participante', capacidades: [], idMiEquipo: null }),
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    expect(nav.secciones).toHaveLength(1)
  })

  it('quien participa y mira otro equipo lo ve en un bloque aparte, bajo el suyo', () => {
    const otro: Equipo = { ...EQUIPO, id: 'e2', nombre: 'Beta' }
    const nav = construirNavActividad({
      actividad: actividad({ rol: 'participante', capacidades: [], idMiEquipo: 'e1' }),
      equipo: otro,
      miEquipo: EQUIPO,
      contexto: { idEquipo: 'e2', seccion: 'metas' },
    })

    expect(nav.secciones.map((s) => s.titulo)).toEqual([
      undefined,
      'Mi equipo: Alfa',
      'Equipo: Beta',
    ])
  })
})
