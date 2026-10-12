import { describe, expect, it } from 'vitest'
import {
  CONFIGURACION_POR_DEFECTO,
  ESTADOS_FORMACION_EQUIPOS,
  ESTADOS_POR_FUNCION,
  FUNCIONES_SEGUIMIENTO,
  PERMISOS_COORGANIZADOR,
  PERMISOS_COORGANIZADOR_POR_DEFECTO,
  esEstadoFormacionEquipos,
  parsearEstadoEspacioEquipo,
  serializarEstadoEspacioEquipo,
} from './actividades.js'

describe('catálogo de funciones de seguimiento', () => {
  it('tiene exactamente ocho funciones (nucleo §7.1)', () => {
    expect(FUNCIONES_SEGUIMIENTO).toHaveLength(8)
  })

  it('el reporte de trabajo ya no es una función: vive en los avances del espacio de equipo', () => {
    expect(FUNCIONES_SEGUIMIENTO).not.toContain('reporte_trabajo')
  })

  it('tiene un valor por defecto para cada función (P-25)', () => {
    for (const funcion of FUNCIONES_SEGUIMIENTO) {
      expect(CONFIGURACION_POR_DEFECTO[funcion]).toBeDefined()
    }
  })

  it('el valor por defecto de cada función (salvo espacio_equipo) está en su lista de estados válidos', () => {
    for (const funcion of FUNCIONES_SEGUIMIENTO) {
      if (funcion === 'espacio_equipo') continue
      expect(ESTADOS_POR_FUNCION[funcion]).toContain(CONFIGURACION_POR_DEFECTO[funcion])
    }
  })
})

describe('estado compuesto de espacio_equipo', () => {
  it('serializa y parsea de vuelta al mismo valor', () => {
    const estado = { metas: 'obligatorio', avances: 'opcional', recursos: 'opcional' } as const
    expect(parsearEstadoEspacioEquipo(serializarEstadoEspacioEquipo(estado))).toEqual(estado)
  })

  it('rechaza JSON inválido, con claves de más o de menos, o valores fuera de catálogo', () => {
    expect(parsearEstadoEspacioEquipo('no es json')).toBeNull()
    expect(parsearEstadoEspacioEquipo('{"metas":"opcional"}')).toBeNull()
    expect(
      parsearEstadoEspacioEquipo('{"metas":"x","avances":"opcional","recursos":"opcional"}'),
    ).toBeNull()
  })

  it('admite deshabilitado en cualquiera de los tres elementos', () => {
    const estado = {
      metas: 'deshabilitado',
      avances: 'opcional',
      recursos: 'deshabilitado',
    } as const
    expect(parsearEstadoEspacioEquipo(serializarEstadoEspacioEquipo(estado))).toEqual(estado)
  })

  it('el valor por defecto del catálogo es válido', () => {
    expect(parsearEstadoEspacioEquipo(CONFIGURACION_POR_DEFECTO.espacio_equipo)).not.toBeNull()
  })
})

describe('catálogo de permisos de co-organizador', () => {
  it('el conjunto por defecto es un subconjunto del catálogo completo', () => {
    for (const permiso of PERMISOS_COORGANIZADOR_POR_DEFECTO) {
      expect(PERMISOS_COORGANIZADOR).toContain(permiso)
    }
  })

  it('gestionar_coorganizadores e iniciar_cierre_y_archivar no están en el conjunto por defecto', () => {
    expect(PERMISOS_COORGANIZADOR_POR_DEFECTO).not.toContain('gestionar_coorganizadores')
    expect(PERMISOS_COORGANIZADOR_POR_DEFECTO).not.toContain('iniciar_cierre_y_archivar')
  })
})

describe('estados de formacion_equipos', () => {
  it('son los dos estados de la función, y coinciden con el catálogo por función', () => {
    expect([...ESTADOS_FORMACION_EQUIPOS]).toEqual(['autogestionado', 'manual'])
    expect(ESTADOS_POR_FUNCION.formacion_equipos).toEqual(ESTADOS_FORMACION_EQUIPOS)
  })

  it('esEstadoFormacionEquipos rechaza cualquier otro valor', () => {
    expect(esEstadoFormacionEquipos('manual')).toBe(true)
    expect(esEstadoFormacionEquipos('dirigido')).toBe(false)
    expect(esEstadoFormacionEquipos(undefined)).toBe(false)
  })
})
