import { describe, expect, it } from 'vitest'
import { primeraSeccionHabilitada } from './espacioEquipo'
import type { Actividad } from './tipos'

function actividad(
  configuracion: Actividad['configuracion'],
  rol: Actividad['rol'] = 'participante',
) {
  return { id: 'a1', nombre: 'Taller', rol, configuracion } as Actividad
}

const espacio = (metas: string, avances: string, recursos: string) =>
  JSON.stringify({ metas, avances, recursos })

describe('primeraSeccionHabilitada', () => {
  it('entra a metas cuando está habilitada', () => {
    expect(
      primeraSeccionHabilitada(
        actividad({ espacio_equipo: espacio('opcional', 'opcional', 'opcional') }),
      ),
    ).toBe('metas')
  })

  it('salta las secciones deshabilitadas', () => {
    expect(
      primeraSeccionHabilitada(
        actividad({ espacio_equipo: espacio('deshabilitado', 'obligatorio', 'opcional') }),
      ),
    ).toBe('avances')
  })

  it('sin espacio de equipo, entra a la bitácora propia si está habilitada', () => {
    const config = {
      espacio_equipo: espacio('deshabilitado', 'deshabilitado', 'deshabilitado'),
      bitacora_individual: 'habilitada',
    }
    expect(primeraSeccionHabilitada(actividad(config))).toBe('bitacora')
    expect(primeraSeccionHabilitada(actividad(config, 'organizador'))).toBeNull()
  })

  it('sin configuración legible, trata las secciones como habilitadas', () => {
    expect(primeraSeccionHabilitada(actividad({}))).toBe('metas')
  })
})
