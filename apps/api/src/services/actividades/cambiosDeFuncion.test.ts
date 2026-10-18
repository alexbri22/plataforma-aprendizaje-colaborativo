import {
  FUNCIONES_SEGUIMIENTO,
  serializarEstadoEspacioEquipo,
  type EstadoEspacioEquipo,
} from '@plataforma/shared'
import { describe, expect, it } from 'vitest'
import { COMPROBADORES_DE_DATOS, evaluarCambioEnCurso } from './cambiosDeFuncion.js'

const CON_DATOS = 'Ya tiene datos.'
const espacio = (e: EstadoEspacioEquipo) => serializarEstadoEspacioEquipo(e)

describe('evaluarCambioEnCurso', () => {
  it('habilitar una función deshabilitada siempre se permite, tenga o no datos', () => {
    expect(
      evaluarCambioEnCurso('bitacora_individual', 'deshabilitada', 'habilitada', CON_DATOS),
    ).toEqual({ permitido: true })
    expect(evaluarCambioEnCurso('calificacion', 'deshabilitada', 'rubrica', null)).toEqual({
      permitido: true,
    })
  })

  it('deshabilitar o cambiar de modo sin datos se permite', () => {
    expect(
      evaluarCambioEnCurso('bitacora_individual', 'habilitada', 'deshabilitada', null),
    ).toEqual({ permitido: true })
    expect(evaluarCambioEnCurso('calificacion', 'directa', 'rubrica', null)).toEqual({
      permitido: true,
    })
  })

  it('deshabilitar o cambiar de modo con datos se impide, con el motivo', () => {
    expect(
      evaluarCambioEnCurso('bitacora_individual', 'habilitada', 'deshabilitada', CON_DATOS),
    ).toEqual({ permitido: false, motivo: CON_DATOS })
    expect(evaluarCambioEnCurso('calificacion', 'directa', 'rubrica', CON_DATOS)).toEqual({
      permitido: false,
      motivo: CON_DATOS,
    })
  })

  it('no cambiar nada nunca es un problema', () => {
    expect(evaluarCambioEnCurso('calificacion', 'directa', 'directa', CON_DATOS)).toEqual({
      permitido: true,
    })
  })

  it('espacio_equipo: habilitar un elemento deshabilitado es libre aunque otro tenga contenido', () => {
    const antes = espacio({
      metas: 'opcional',
      avances: 'deshabilitado',
      recursos: 'deshabilitado',
    })
    const despues = espacio({ metas: 'opcional', avances: 'opcional', recursos: 'deshabilitado' })
    expect(evaluarCambioEnCurso('espacio_equipo', antes, despues, CON_DATOS)).toEqual({
      permitido: true,
    })
  })

  it('espacio_equipo: tocar un elemento ya habilitado con datos se impide', () => {
    const antes = espacio({ metas: 'opcional', avances: 'opcional', recursos: 'opcional' })
    for (const despues of [
      espacio({ metas: 'deshabilitado', avances: 'opcional', recursos: 'opcional' }),
      espacio({ metas: 'obligatorio', avances: 'opcional', recursos: 'opcional' }),
    ]) {
      expect(evaluarCambioEnCurso('espacio_equipo', antes, despues, CON_DATOS)).toEqual({
        permitido: false,
        motivo: CON_DATOS,
      })
    }
  })

  it('formacion_equipos, con su motivo fijo, no cambia una vez cerrada', () => {
    expect(
      evaluarCambioEnCurso('formacion_equipos', 'autogestionado', 'manual', CON_DATOS),
    ).toEqual({ permitido: false, motivo: CON_DATOS })
  })
})

describe('COMPROBADORES_DE_DATOS', () => {
  it('tiene un comprobador por cada función del catálogo, para que ninguna se olvide', () => {
    expect(Object.keys(COMPROBADORES_DE_DATOS).sort()).toEqual([...FUNCIONES_SEGUIMIENTO].sort())
  })
})
