import { ACCIONES_ACTIVIDAD, PERMISOS_COORGANIZADOR } from '@plataforma/shared'
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

describe('capacidadesDe', () => {
  it('un organizador en fase inscripción obtiene las tres acciones del catálogo', () => {
    const capacidades = capacidadesDe(actor('organizador'), { estado: 'inscripcion' })
    expect(new Set(capacidades)).toEqual(new Set(ACCIONES_ACTIVIDAD))
  })

  it('un participante nunca obtiene ninguna capacidad de este catálogo', () => {
    for (const estado of TODAS_LAS_FASES) {
      expect(capacidadesDe(actor('participante'), { estado })).toEqual([])
    }
  })

  it('en fase archivada nadie obtiene ninguna capacidad, ni con todos los permisos', () => {
    const conTodosLosPermisos = actor('co_organizador', [...PERMISOS_COORGANIZADOR])
    for (const contexto of [actor('organizador'), conTodosLosPermisos, actor('participante')]) {
      expect(capacidadesDe(contexto, { estado: 'archivada' })).toEqual([])
    }
  })
})
