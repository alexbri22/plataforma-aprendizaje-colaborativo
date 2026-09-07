import { describe, expect, it } from 'vitest'
import {
  CONFIGURACION_POR_DEFECTO,
  ESTADOS_POR_FUNCION,
  FUNCIONES_SEGUIMIENTO,
  PERMISOS_COORGANIZADOR,
  PERMISOS_COORGANIZADOR_POR_DEFECTO,
  parsearEstadoEspacioEquipo,
  serializarEstadoEspacioEquipo,
} from './actividades.js'

describe('catálogo de funciones de seguimiento', () => {
  it('tiene exactamente nueve funciones (nucleo §7.1)', () => {
    expect(FUNCIONES_SEGUIMIENTO).toHaveLength(9)
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
