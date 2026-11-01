import { describe, expect, it } from 'vitest'
import { primeraSeccionHabilitada } from './espacioEquipo'
import type { Actividad } from './tipos'

function actividad(
  configuracion: Actividad['configuracion'],
  rol: Actividad['rol'] = 'participante',
) {
  return { id: 'a1', nombre: 'Taller', rol, configuracion } as Actividad
}

// Planeación y Producto siguen a Metas y a Materiales; por defecto,
// deshabilitados para que cada caso pruebe solo los tres de siempre.
const espacio = (
  metas: string,
  avances: string,
  recursos: string,
  planeacion = 'deshabilitado',
  producto = 'deshabilitado',
) => JSON.stringify({ metas, planeacion, avances, recursos, producto })

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

  it('Planeación va después de Metas y antes de Avances', () => {
    expect(
      primeraSeccionHabilitada(
        actividad({
          espacio_equipo: espacio('deshabilitado', 'opcional', 'opcional', 'opcional'),
        }),
      ),
    ).toBe('planeacion')
  })

  it('una configuración guardada antes de Planeación y Producto los toma como opcionales', () => {
    const antigua = JSON.stringify({
      metas: 'deshabilitado',
      avances: 'deshabilitado',
      recursos: 'deshabilitado',
    })
    expect(primeraSeccionHabilitada(actividad({ espacio_equipo: antigua }))).toBe('planeacion')
  })

  it('sin configuración legible, trata las secciones como habilitadas', () => {
    expect(primeraSeccionHabilitada(actividad({}))).toBe('metas')
  })
})
