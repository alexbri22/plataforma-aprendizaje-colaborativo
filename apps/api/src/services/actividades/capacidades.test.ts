import {
  ACCIONES_ACTIVIDAD,
  ESTADOS_FORMACION_EQUIPOS,
  PERMISOS_COORGANIZADOR,
  type AccionActividad,
  type EstadoFormacionEquipos,
} from '@plataforma/shared'
import type { EstadoActividad, PermisoCoorganizador } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { autorizar, capacidadesDe, type ContextoActorActividad } from './capacidades.js'

const TODAS_LAS_FASES: EstadoActividad[] = [
  'configuracion',
  'inscripcion',
  'formacion_equipos',
  'desarrollo',
  'cierre',
  'archivada',
]

function actor(
  rol: ContextoActorActividad['rol'],
  permisos: PermisoCoorganizador[] = [],
): ContextoActorActividad {
  return { rol, estadoMembresia: 'activa', permisos: new Set(permisos) }
}

describe('autorizar: regla transversal de actividad archivada', () => {
  it('rechaza por fase a cualquier rol, incluido el organizador', () => {
    for (const rol of ['organizador', 'co_organizador', 'participante'] as const) {
      const resultado = autorizar(actor(rol), 'cerrar_inscripcion', { estado: 'archivada' })
      expect(resultado).toEqual({ concedido: false, motivo: 'fase' })
    }
  })
})

describe('autorizar: membresía desactivada', () => {
  it('rechaza sin importar el rol ni la fase', () => {
    const desactivado: ContextoActorActividad = {
      rol: 'organizador',
      estadoMembresia: 'desactivada',
      permisos: new Set(),
    }
    expect(autorizar(desactivado, 'cerrar_inscripcion', { estado: 'inscripcion' })).toEqual({
      concedido: false,
      motivo: 'rol',
    })
  })
})

describe('autorizar: cerrar_inscripcion', () => {
  it('el organizador solo puede en fase inscripción', () => {
    for (const estado of TODAS_LAS_FASES) {
      const resultado = autorizar(actor('organizador'), 'cerrar_inscripcion', { estado })
      if (estado === 'inscripcion') {
        expect(resultado).toEqual({ concedido: true })
      } else {
        expect(resultado.concedido).toBe(false)
      }
    }
  })

  it('un co-organizador sin el permiso gestionar_inscripcion no puede', () => {
    const resultado = autorizar(
      actor('co_organizador', ['configurar_actividad']),
      'cerrar_inscripcion',
      {
        estado: 'inscripcion',
      },
    )
    expect(resultado).toEqual({ concedido: false, motivo: 'rol' })
  })

  it('un co-organizador con el permiso gestionar_inscripcion sí puede', () => {
    const resultado = autorizar(
      actor('co_organizador', ['gestionar_inscripcion']),
      'cerrar_inscripcion',
      {
        estado: 'inscripcion',
      },
    )
    expect(resultado).toEqual({ concedido: true })
  })

  it('un participante nunca puede', () => {
    const resultado = autorizar(actor('participante'), 'cerrar_inscripcion', {
      estado: 'inscripcion',
    })
    expect(resultado).toEqual({ concedido: false, motivo: 'rol' })
  })
})

describe('autorizar: configurar_funciones', () => {
  it('se permite en configuración, inscripción y formación; no en desarrollo, cierre ni archivada', () => {
    const permitidas: EstadoActividad[] = ['configuracion', 'inscripcion', 'formacion_equipos']
    for (const estado of TODAS_LAS_FASES) {
      const resultado = autorizar(actor('organizador'), 'configurar_funciones', { estado })
      expect(resultado.concedido).toBe(permitidas.includes(estado))
    }
  })
})

describe('autorizar: ajustar_funciones', () => {
  it('se permite en desarrollo y cierre; no antes (ahí es configurar_funciones) ni archivada', () => {
    const permitidas: EstadoActividad[] = ['desarrollo', 'cierre']
    for (const estado of TODAS_LAS_FASES) {
      const resultado = autorizar(actor('organizador'), 'ajustar_funciones', { estado })
      expect(resultado.concedido, estado).toBe(permitidas.includes(estado))
    }
  })

  it('las dos acciones de configuración cubren juntas todas las fases salvo archivada', () => {
    for (const estado of TODAS_LAS_FASES) {
      const alguna =
        autorizar(actor('organizador'), 'configurar_funciones', { estado }).concedido ||
        autorizar(actor('organizador'), 'ajustar_funciones', { estado }).concedido
      expect(alguna, estado).toBe(estado !== 'archivada')
    }
  })

  it('un co-organizador necesita configurar_actividad; un participante nunca puede', () => {
    const en = { estado: 'desarrollo' as const }
    expect(
      autorizar(actor('co_organizador', ['gestionar_equipos']), 'ajustar_funciones', en),
    ).toEqual({
      concedido: false,
      motivo: 'rol',
    })
    expect(
      autorizar(actor('co_organizador', ['configurar_actividad']), 'ajustar_funciones', en),
    ).toEqual({ concedido: true })
    expect(autorizar(actor('participante'), 'ajustar_funciones', en)).toEqual({
      concedido: false,
      motivo: 'rol',
    })
  })
})

describe('autorizar: ajustar_periodos', () => {
  it('se permite desde configuración hasta desarrollo; no en cierre ni archivada', () => {
    const permitidas: EstadoActividad[] = [
      'configuracion',
      'inscripcion',
      'formacion_equipos',
      'desarrollo',
    ]
    for (const estado of TODAS_LAS_FASES) {
      const resultado = autorizar(actor('organizador'), 'ajustar_periodos', { estado })
      expect(resultado.concedido).toBe(permitidas.includes(estado))
    }
  })

  it('un co-organizador necesita configurar_actividad', () => {
    const sin = autorizar(actor('co_organizador', ['gestionar_equipos']), 'ajustar_periodos', {
      estado: 'desarrollo',
    })
    const con = autorizar(actor('co_organizador', ['configurar_actividad']), 'ajustar_periodos', {
      estado: 'desarrollo',
    })
    expect(sin).toEqual({ concedido: false, motivo: 'rol' })
    expect(con).toEqual({ concedido: true })
  })

  it('un participante nunca puede', () => {
    expect(autorizar(actor('participante'), 'ajustar_periodos', { estado: 'inscripcion' })).toEqual(
      {
        concedido: false,
        motivo: 'rol',
      },
    )
  })
})

describe('autorizar: agregar_coorganizador', () => {
  it('se permite en toda fase salvo archivada', () => {
    for (const estado of TODAS_LAS_FASES) {
      const resultado = autorizar(actor('organizador'), 'agregar_coorganizador', { estado })
      expect(resultado.concedido).toBe(estado !== 'archivada')
    }
  })

  it('el permiso por defecto de un co-organizador no incluye gestionar_coorganizadores', () => {
    const conPermisosPorDefecto = actor('co_organizador', [
      'configurar_actividad',
      'gestionar_inscripcion',
      'gestionar_equipos',
      'calificar_y_comentar',
      'leer_bitacoras',
      'otorgar_insignias',
      'desactivar_participantes',
      'consultar_historial_completo',
    ])
    const resultado = autorizar(conPermisosPorDefecto, 'agregar_coorganizador', {
      estado: 'inscripcion',
    })
    expect(resultado).toEqual({ concedido: false, motivo: 'rol' })
  })
})

// Acciones de Actividades: las que ya existían antes de Equipos.
const ACCIONES_DE_ACTIVIDADES: AccionActividad[] = [
  'configurar_funciones',
  'ajustar_funciones',
  'ajustar_periodos',
  'cerrar_inscripcion',
  'agregar_coorganizador',
]

// Transcripción independiente de la matriz de Equipos (general §7.3 y §6.1,
// nucleo §7.4 y §8), escrita como especificación y no derivada de las tablas
// de capacidades.ts: si alguien cambia una celda allí, esta prueba lo nota.
// Recorre rol × permiso × fase × estado de la función, celda por celda.
type Formacion = EstadoFormacionEquipos | undefined
type Rol = 'organizador' | 'co_con_permiso' | 'co_sin_permiso' | 'participante'

function esperado(
  accion: AccionActividad,
  rol: Rol,
  fase: EstadoActividad,
  formacion: Formacion,
): boolean {
  const fases: Record<string, EstadoActividad[]> = {
    formar_equipos: ['formacion_equipos'],
    asignar_integrantes: ['formacion_equipos', 'desarrollo'],
    cerrar_formacion: ['formacion_equipos'],
    elegir_equipo: ['formacion_equipos'],
    editar_equipo: ['formacion_equipos', 'desarrollo', 'cierre'],
    generar_propuesta_equipos: ['formacion_equipos'],
  }
  if (!fases[accion].includes(fase)) return false

  if (accion === 'elegir_equipo' && formacion !== 'autogestionado') return false
  if (accion === 'generar_propuesta_equipos' && formacion !== 'propuesta_sistema') return false

  // Elegir equipo es sobre uno mismo: lo tiene todo miembro. Editar un equipo
  // lo tiene el participante (el suyo, lo verifica el servicio) y quien
  // gestiona equipos. El resto, solo quien gestiona.
  if (accion === 'elegir_equipo') return true
  if (accion === 'editar_equipo' && rol === 'participante') return true
  return rol === 'organizador' || rol === 'co_con_permiso'
}

function contextoDeRol(rol: Rol): ContextoActorActividad {
  switch (rol) {
    case 'organizador':
      return actor('organizador')
    case 'co_con_permiso':
      return actor('co_organizador', ['gestionar_equipos'])
    case 'co_sin_permiso':
      // Todos los demás permisos, menos el de equipos.
      return actor(
        'co_organizador',
        PERMISOS_COORGANIZADOR.filter((p) => p !== 'gestionar_equipos'),
      )
    case 'participante':
      return actor('participante')
  }
}

const ACCIONES_DE_EQUIPOS = ACCIONES_ACTIVIDAD.filter(
  (accion) => !ACCIONES_DE_ACTIVIDADES.includes(accion),
)

describe('autorizar: acciones de Equipos, celda por celda', () => {
  it('el catálogo de Equipos son exactamente las seis acciones esperadas', () => {
    expect(new Set(ACCIONES_DE_EQUIPOS)).toEqual(
      new Set([
        'formar_equipos',
        'asignar_integrantes',
        'cerrar_formacion',
        'elegir_equipo',
        'editar_equipo',
        'generar_propuesta_equipos',
      ]),
    )
  })

  const formaciones: Formacion[] = [...ESTADOS_FORMACION_EQUIPOS, undefined]
  const roles: Rol[] = ['organizador', 'co_con_permiso', 'co_sin_permiso', 'participante']

  for (const accion of [
    'formar_equipos',
    'asignar_integrantes',
    'cerrar_formacion',
    'elegir_equipo',
    'editar_equipo',
    'generar_propuesta_equipos',
  ] as const) {
    it(`${accion}: coincide con la especificación en las 4 × 6 × 4 combinaciones`, () => {
      for (const rol of roles) {
        for (const fase of TODAS_LAS_FASES) {
          for (const formacion of formaciones) {
            const resultado = autorizar(contextoDeRol(rol), accion, {
              estado: fase,
              formacionEquipos: formacion,
            })
            expect(resultado.concedido, `${accion} / ${rol} / ${fase} / ${String(formacion)}`).toBe(
              fase === 'archivada' ? false : esperado(accion, rol, fase, formacion),
            )
          }
        }
      }
    })
  }

  it('nadie puede en una actividad archivada, con motivo de fase', () => {
    for (const accion of ACCIONES_DE_EQUIPOS) {
      for (const rol of ['organizador', 'co_con_permiso', 'participante'] as Rol[]) {
        expect(
          autorizar(contextoDeRol(rol), accion, {
            estado: 'archivada',
            formacionEquipos: 'autogestionado',
          }),
        ).toEqual({ concedido: false, motivo: 'fase' })
      }
    }
  })

  it('una membresía desactivada no puede nada, ni siquiera elegir equipo', () => {
    const desactivado: ContextoActorActividad = {
      rol: 'participante',
      estadoMembresia: 'desactivada',
      permisos: new Set(),
    }
    for (const accion of ACCIONES_DE_EQUIPOS) {
      expect(
        autorizar(desactivado, accion, {
          estado: 'formacion_equipos',
          formacionEquipos: 'autogestionado',
        }).concedido,
      ).toBe(false)
    }
  })

  it('distingue el motivo: fase, estado de la función o rol', () => {
    const participante = actor('participante')
    expect(
      autorizar(participante, 'elegir_equipo', {
        estado: 'desarrollo',
        formacionEquipos: 'autogestionado',
      }),
    ).toEqual({ concedido: false, motivo: 'fase' })
    expect(
      autorizar(participante, 'elegir_equipo', {
        estado: 'formacion_equipos',
        formacionEquipos: 'manual',
      }),
    ).toEqual({ concedido: false, motivo: 'funcion' })
    expect(
      autorizar(participante, 'asignar_integrantes', {
        estado: 'formacion_equipos',
        formacionEquipos: 'manual',
      }),
    ).toEqual({ concedido: false, motivo: 'rol' })
  })

  it('las acciones de Equipos no dependen de ninguna bandera de actividad', () => {
    // Misma persona, misma fase y misma función: mismo resultado. La firma de
    // ActividadParaAutorizacion no tiene dónde recibir un "tipo" de actividad.
    const a = autorizar(actor('participante'), 'elegir_equipo', {
      estado: 'formacion_equipos',
      formacionEquipos: 'autogestionado',
    })
    expect(a).toEqual({ concedido: true })
  })
})

describe('capacidadesDe', () => {
  it('un organizador en fase inscripción obtiene todas las acciones de Actividades abiertas en ella', () => {
    const capacidades = capacidadesDe(actor('organizador'), {
      estado: 'inscripcion',
      formacionEquipos: 'autogestionado',
    })
    expect(new Set(capacidades)).toEqual(
      new Set([
        'configurar_funciones',
        'ajustar_periodos',
        'cerrar_inscripcion',
        'agregar_coorganizador',
      ]),
    )
  })

  it('un organizador en formación autogestionada obtiene todo menos la propuesta', () => {
    const capacidades = capacidadesDe(actor('organizador'), {
      estado: 'formacion_equipos',
      formacionEquipos: 'autogestionado',
    })
    expect(capacidades).toContain('elegir_equipo')
    expect(capacidades).toContain('cerrar_formacion')
    expect(capacidades).not.toContain('generar_propuesta_equipos')
    expect(capacidades).not.toContain('cerrar_inscripcion')
  })

  it('un participante no obtiene ninguna acción de Actividades en ninguna fase', () => {
    for (const estado of TODAS_LAS_FASES) {
      const capacidades = capacidadesDe(actor('participante'), {
        estado,
        formacionEquipos: 'autogestionado',
      })
      for (const accion of ACCIONES_DE_ACTIVIDADES) expect(capacidades).not.toContain(accion)
    }
  })

  it('un participante en formación autogestionada solo obtiene elegir y editar equipo', () => {
    expect(
      capacidadesDe(actor('participante'), {
        estado: 'formacion_equipos',
        formacionEquipos: 'autogestionado',
      }),
    ).toEqual(['elegir_equipo', 'editar_equipo'])
  })

  it('en fase archivada nadie obtiene ninguna capacidad, ni con todos los permisos', () => {
    const conTodosLosPermisos = actor('co_organizador', [...PERMISOS_COORGANIZADOR])
    for (const contexto of [actor('organizador'), conTodosLosPermisos, actor('participante')]) {
      expect(
        capacidadesDe(contexto, { estado: 'archivada', formacionEquipos: 'autogestionado' }),
      ).toEqual([])
    }
  })
})
