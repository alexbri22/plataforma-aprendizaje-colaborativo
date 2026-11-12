import type { Equipo } from '@plataforma/shared'
import { describe, expect, it } from 'vitest'
import type { Actividad } from '../../features/actividades'
import {
  construirNavActividad,
  etapaDeActividad,
  type EntradaNavActividad,
  type EstadoEtapa,
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

type Hoja = { etiqueta: string; to?: string; activo: boolean }

// Las hojas (ítems) de una lista de entradas, con los grupos y bloques
// aplanados; las etapas se recorren dentro de `porEtapa`.
function hojas(entradas: EntradaNavActividad[]): Hoja[] {
  return entradas.flatMap((entrada): Hoja[] => {
    if (entrada.tipo === 'item') return [entrada]
    if (entrada.tipo === 'grupo') return entrada.items
    if (entrada.tipo === 'bloque') return hojas(entrada.entradas)
    return hojas(entrada.entradas)
  })
}

function todas(nav: NavActividad): Hoja[] {
  return hojas(nav.secciones.flatMap((s) => s.entradas))
}

function activos(nav: NavActividad) {
  return todas(nav)
    .filter((h) => h.activo)
    .map((h) => h.etiqueta)
}

function etapas(nav: NavActividad) {
  return nav.secciones
    .flatMap((s) => s.entradas)
    .filter((e): e is Extract<EntradaNavActividad, { tipo: 'etapa' }> => e.tipo === 'etapa')
}

function porEtapa(nav: NavActividad) {
  return Object.fromEntries(
    etapas(nav).map((e) => [e.clave, e.entradas.flatMap((x) => hojas([x])).map((h) => h.etiqueta)]),
  )
}

function estados(nav: NavActividad): EstadoEtapa[] {
  return etapas(nav).map((e) => e.estado)
}

function enlace(nav: NavActividad, etiqueta: string): string | undefined {
  return todas(nav).find((h) => h.etiqueta === etiqueta)?.to
}

describe('construirNavActividad: quien organiza', () => {
  it('muestra las tres etapas y la flecha sube a Organizo', () => {
    const nav = construirNavActividad({
      actividad: actividad(),
      contexto: { idActividad: 'a1', seccion: 'equipos' },
    })

    expect(nav.titulo).toBe('Taller de ecología')
    expect(nav.volver).toEqual({ etiqueta: 'Organizo', to: '/actividades/organizo' })
    expect(etapas(nav).map((e) => e.etiqueta)).toEqual(['Creación', 'Desarrollo', 'Cierre'])
    expect(porEtapa(nav)).toEqual({
      creacion: ['Datos de la actividad', 'Planificar', 'Inscripción', 'Conformación de equipos'],
      desarrollo: ['Operación de la planeación', 'Equipos', 'Evaluación y retroalimentación'],
      cierre: [
        'Confirmar cierre de actividad',
        'Otorgar reconocimientos',
        'Calificaciones',
        'Publicación de proyectos',
      ],
    })
  })

  it('marca la etapa en curso y deja Hecha lo anterior y Próxima lo siguiente', () => {
    const en = (fase: Actividad['fase']) =>
      estados(
        construirNavActividad({
          actividad: actividad({ fase }),
          contexto: { idActividad: 'a1', seccion: 'resumen' },
        }),
      )

    expect(en('inscripcion')).toEqual(['actual', 'proxima', 'proxima'])
    expect(en('formacion_equipos')).toEqual(['actual', 'proxima', 'proxima'])
    expect(en('desarrollo')).toEqual(['hecha', 'actual', 'proxima'])
    expect(en('cierre')).toEqual(['hecha', 'hecha', 'actual'])
    expect(en('archivada')).toEqual(['hecha', 'hecha', 'hecha'])
  })

  it('en una etapa Próxima nada lleva a ningún lado', () => {
    const nav = construirNavActividad({
      actividad: actividad({ fase: 'inscripcion', capacidades: ['configurar_funciones'] }),
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    const proximas = etapas(nav).filter((e) => e.estado === 'proxima')

    expect(proximas).toHaveLength(2)
    for (const etapa of proximas) {
      expect(hojas(etapa.entradas).every((h) => h.to === undefined)).toBe(true)
    }
  })

  it('en Creación Planificar y Conformación de equipos llevan a sus pantallas', () => {
    const nav = construirNavActividad({
      actividad: actividad({ fase: 'inscripcion', capacidades: ['configurar_funciones'] }),
      contexto: { idActividad: 'a1', seccion: 'planificar' },
    })

    expect(enlace(nav, 'Planificar')).toBe('/actividades/a1/configuracion')
    expect(enlace(nav, 'Inscripción')).toBe('/actividades/a1/inscripcion')
    expect(enlace(nav, 'Conformación de equipos')).toBe('/actividades/a1/conformacion')
    expect(activos(nav)).toEqual(['Planificar'])
  })

  it('pasada la Creación, Planificar y Conformación de equipos siguen abiertas', () => {
    const nav = construirNavActividad({
      actividad: actividad({ capacidades: ['ajustar_funciones'] }),
      contexto: { idActividad: 'a1', seccion: 'planificar' },
    })

    expect(enlace(nav, 'Planificar')).toBe('/actividades/a1/configuracion')
    expect(enlace(nav, 'Conformación de equipos')).toBe('/actividades/a1/conformacion')
    expect(enlace(nav, 'Operación de la planeación')).toBe('/actividades/a1/operacion')
    expect(enlace(nav, 'Equipos')).toBe('/actividades/a1/equipos')
    expect(todas(nav).map((h) => h.etiqueta)).not.toContain('Editar planificación')
    expect(activos(nav)).toEqual(['Planificar'])
  })

  it('cada pantalla marca su propia entrada, en cualquier etapa', () => {
    const desarrollo = construirNavActividad({
      actividad: actividad(),
      contexto: { idActividad: 'a1', seccion: 'equipos' },
    })
    const conformacion = construirNavActividad({
      actividad: actividad(),
      contexto: { idActividad: 'a1', seccion: 'conformacion' },
    })
    const operacion = construirNavActividad({
      actividad: actividad(),
      contexto: { idActividad: 'a1', seccion: 'operacion' },
    })

    expect(activos(desarrollo)).toEqual(['Equipos'])
    expect(activos(conformacion)).toEqual(['Conformación de equipos'])
    expect(activos(operacion)).toEqual(['Operación de la planeación'])
  })

  it('sin capacidades de planificación no ofrece Planificar ni Editar planificación', () => {
    const nav = construirNavActividad({
      actividad: actividad({ capacidades: [] }),
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    const etiquetas = todas(nav).map((h) => h.etiqueta)

    expect(etiquetas).not.toContain('Planificar')
    expect(etiquetas).not.toContain('Editar planificación')
  })

  it('Datos de la actividad y Confirmar cierre son entradas distintas, cada una con su pantalla', () => {
    const cierre = actividad({ fase: 'cierre' })
    const datos = construirNavActividad({
      actividad: cierre,
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    const confirmar = construirNavActividad({
      actividad: cierre,
      contexto: { idActividad: 'a1', seccion: 'cierre' },
    })

    expect(enlace(datos, 'Confirmar cierre de actividad')).toBe('/actividades/a1/cierre')
    expect(activos(datos)).toEqual(['Datos de la actividad'])
    expect(activos(confirmar)).toEqual(['Confirmar cierre de actividad'])
  })

  it('Otorgar reconocimientos solo se abre mientras el ritual está abierto', () => {
    const con = (abierto: boolean) =>
      enlace(
        construirNavActividad({
          actividad: actividad({ fase: 'cierre' }),
          ritual: { abierto, aplicados: false },
          contexto: { idActividad: 'a1', seccion: 'resumen' },
        }),
        'Otorgar reconocimientos',
      )

    expect(con(true)).toBe('/actividades/a1/reconocer')
    expect(con(false)).toBeUndefined()
  })

  it('debajo del nombre dice cuándo cierra, o cuándo cerró', () => {
    const con = (fase: Actividad['fase']) =>
      construirNavActividad({
        actividad: actividad({ fase, fechaTermino: '2026-12-18' }),
        contexto: { idActividad: 'a1', seccion: 'resumen' },
      }).subtitulos

    expect(con('desarrollo')).toEqual(['Cierra el 18 dic 2026'])
    expect(con('cierre')).toEqual(['Cerró el 18 dic 2026'])
  })

  it('el Resumen sube con la flecha a Organizo', () => {
    const nav = construirNavActividad({
      actividad: actividad(),
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })

    expect(nav.volver).toEqual({ etiqueta: 'Organizo', to: '/actividades/organizo' })
  })
})

describe('construirNavActividad: quien organiza dentro de un equipo', () => {
  it('regresa con la flecha a Equipos, y el equipo es el título', () => {
    const nav = construirNavActividad({
      actividad: actividad({ configuracion: { bitacora_individual: 'guiada' } }),
      contexto: { idEquipo: 'e1', seccion: 'metas' },
      equipo: EQUIPO,
    })

    expect(nav.volver).toEqual({ etiqueta: 'Equipos', to: '/actividades/a1/equipos' })
    expect(nav.titulo).toBe('Alfa')
    expect(nav.subtitulos[0]).toBe('Taller de ecología')
    expect(etapas(nav)).toHaveLength(0)
  })

  it('solo ve el proyecto, el proceso y las bitácoras del equipo', () => {
    const nav = construirNavActividad({
      actividad: actividad({ configuracion: { bitacora_individual: 'guiada' } }),
      equipo: EQUIPO,
      contexto: { idEquipo: 'e1', seccion: 'bitacora-integrante', idMembresia: 'm1' },
    })

    expect(nav.secciones).toHaveLength(1)
    expect(todas(nav).map((h) => h.etiqueta)).toEqual([
      'Metas',
      'Planeación',
      'Avances',
      'Materiales',
      'Producto',
      'Definición de responsabilidades',
      'Interdependencia positiva',
      'Responsabilidad individual y grupal',
      'Interacción',
      'Evaluación de grupo y habilidades sociales',
      'Bitácoras',
    ])
    // La bitácora de alguien cuenta como estar en Bitácoras.
    expect(activos(nav)).toEqual(['Bitácoras'])
  })

  it('sin bitácora individual habilitada no ofrece Bitácoras', () => {
    const nav = construirNavActividad({
      actividad: actividad(),
      equipo: EQUIPO,
      contexto: { idEquipo: 'e1', seccion: 'metas' },
    })

    expect(todas(nav).map((h) => h.etiqueta)).not.toContain('Bitácoras')
  })

  it('oculta lo deshabilitado salvo la sección en la que se está', () => {
    const espacio = JSON.stringify({ metas: 'deshabilitado', avances: 'deshabilitado' })
    const nav = construirNavActividad({
      actividad: actividad({ configuracion: { espacio_equipo: espacio } }),
      equipo: EQUIPO,
      contexto: { idEquipo: 'e1', seccion: 'metas' },
    })

    const proyecto = todas(nav)
      .map((h) => h.etiqueta)
      .slice(0, 4)
    expect(proyecto).toEqual(['Metas', 'Planeación', 'Materiales', 'Producto'])
  })
})

describe('construirNavActividad: quien participa', () => {
  const participante = (sobrescribir: Partial<Actividad> = {}) =>
    actividad({
      rol: 'participante',
      capacidades: [],
      idMiEquipo: 'e1',
      configuracion: { bitacora_individual: 'guiada' },
      ...sobrescribir,
    })

  it('ve las etapas, con "Mi equipo" como título dentro de Desarrollo', () => {
    const nav = construirNavActividad({
      actividad: participante(),
      miEquipo: EQUIPO,
      contexto: { idEquipo: 'e1', seccion: 'avances' },
      equipo: EQUIPO,
    })

    expect(nav.volver).toEqual({ etiqueta: 'Participo', to: '/actividades/participo' })
    expect(nav.subtitulos).toEqual(['Organiza Ana'])

    const desarrollo = etapas(nav).find((e) => e.clave === 'desarrollo')!
    const bloque = desarrollo.entradas.find((e) => e.tipo === 'bloque')
    expect(bloque?.etiqueta).toBe('Mi equipo: Alfa')
    expect(hojas(desarrollo.entradas).map((h) => h.etiqueta)).toContain('Mi bitácora')
    expect(activos(nav)).toEqual(['Avances'])
    expect(porEtapa(nav).desarrollo.slice(-3)).toEqual([
      'Operación de la planeación',
      'Equipos',
      'Evaluación y retroalimentación',
    ])
    expect(enlace(nav, 'Evaluación y retroalimentación')).toBe('/actividades/a1/evaluacion')
  })

  it('"Mi equipo" es un título sin enlace', () => {
    const nav = construirNavActividad({
      actividad: participante(),
      miEquipo: EQUIPO,
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    const desarrollo = etapas(nav).find((e) => e.clave === 'desarrollo')!
    const bloque = desarrollo.entradas.find((e) => e.tipo === 'bloque')!

    expect(bloque).not.toHaveProperty('to')
  })

  it('en Creación ve Conformación de equipos solo si los equipos no los arma quien organiza', () => {
    const con = (formacion: string) =>
      porEtapa(
        construirNavActividad({
          actividad: participante({
            fase: 'formacion_equipos',
            idMiEquipo: null,
            configuracion: { formacion_equipos: formacion },
          }),
          contexto: { idActividad: 'a1', seccion: 'resumen' },
        }),
      ).creacion

    expect(con('libre')).toEqual(['Datos de la actividad', 'Conformación de equipos'])
    expect(con('manual')).toEqual(['Datos de la actividad'])
  })

  it('Otorgar reconocimientos solo aparece con el ritual abierto', () => {
    const con = (abierto: boolean) =>
      porEtapa(
        construirNavActividad({
          actividad: participante({ fase: 'cierre' }),
          ritual: { abierto, aplicados: false },
          contexto: { idActividad: 'a1', seccion: 'resumen' },
        }),
      ).cierre

    expect(con(true)).toContain('Otorgar reconocimientos')
    expect(con(false)).not.toContain('Otorgar reconocimientos')
  })

  it('no ve entradas exclusivas de quien organiza', () => {
    const nav = construirNavActividad({
      actividad: participante(),
      miEquipo: EQUIPO,
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    const etiquetas = todas(nav).map((h) => h.etiqueta)

    for (const ajena of [
      'Planificar',
      'Editar planificación',
      'Inscripción',
      'Confirmar cierre de actividad',
    ]) {
      expect(etiquetas).not.toContain(ajena)
    }
  })

  it('sin equipo no tiene bloque "Mi equipo"', () => {
    const nav = construirNavActividad({
      actividad: participante({ idMiEquipo: null }),
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })
    const desarrollo = etapas(nav).find((e) => e.clave === 'desarrollo')!

    expect(desarrollo.entradas.some((e) => e.tipo === 'bloque')).toBe(false)
  })

  it('al mirar otro equipo queda marcado Equipos, no algo de su propio equipo', () => {
    const otro: Equipo = { ...EQUIPO, id: 'e2', nombre: 'Beta' }
    const nav = construirNavActividad({
      actividad: participante(),
      equipo: otro,
      miEquipo: EQUIPO,
      contexto: { idEquipo: 'e2', seccion: 'metas' },
    })

    expect(activos(nav)).toEqual(['Equipos'])
    expect(nav.volver).toEqual({ etiqueta: 'Participo', to: '/actividades/participo' })
  })
})

describe('etapaDeActividad', () => {
  it('agrupa las fases en las tres etapas y no tiene una para la archivada', () => {
    const de = (fase: Actividad['fase']) => etapaDeActividad(actividad({ fase }))

    expect(de('configuracion')).toBe('creacion')
    expect(de('inscripcion')).toBe('creacion')
    expect(de('formacion_equipos')).toBe('creacion')
    expect(de('desarrollo')).toBe('desarrollo')
    expect(de('cierre')).toBe('cierre')
    expect(de('archivada')).toBeNull()
  })
})

describe('construirNavActividad: calificaciones y cierre', () => {
  const conCalificacion = (fase: Actividad['fase'], rol: Actividad['rol'] = 'organizador') =>
    construirNavActividad({
      actividad: actividad({ fase, rol, configuracion: { calificacion: 'habilitada' } }),
      contexto: { idActividad: 'a1', seccion: 'resumen' },
    })

  it('Evaluación y retroalimentación lleva a la retroalimentación, no a las calificaciones', () => {
    expect(enlace(conCalificacion('desarrollo'), 'Evaluación y retroalimentación')).toBe(
      '/actividades/a1/evaluacion',
    )
  })

  it('las calificaciones solo se abren en el cierre, también para quien organiza', () => {
    expect(enlace(conCalificacion('desarrollo'), 'Calificaciones')).toBeUndefined()
    expect(enlace(conCalificacion('cierre'), 'Calificaciones')).toBe(
      '/actividades/a1/calificaciones',
    )
    expect(enlace(conCalificacion('cierre', 'participante'), 'Calificaciones')).toBe(
      '/actividades/a1/resultados',
    )
  })

  it('Publicación de proyectos lleva a su pantalla en el cierre', () => {
    expect(enlace(conCalificacion('cierre'), 'Publicación de proyectos')).toBe(
      '/actividades/a1/publicacion',
    )
    expect(enlace(conCalificacion('desarrollo'), 'Publicación de proyectos')).toBeUndefined()
  })

  it('Participantes no está en el menú (no está en el mapa de navegación)', () => {
    const etiquetas = todas(conCalificacion('cierre')).map((h) => h.etiqueta)
    expect(etiquetas).not.toContain('Participantes')
  })
})
