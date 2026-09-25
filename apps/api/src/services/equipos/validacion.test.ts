import { describe, expect, it } from 'vitest'
import { ErrorValidacion } from '../../errores.js'
import { validarDatosActualizarEquipo, validarDatosCrearEquipo } from './validacion.js'

describe('validarDatosCrearEquipo', () => {
  it('recorta el nombre', () => {
    expect(validarDatosCrearEquipo({ nombre: '  Los pumas  ' })).toEqual({ nombre: 'Los pumas' })
  })

  it('rechaza un nombre vacío, ausente, no textual o demasiado largo', () => {
    for (const cuerpo of [{}, { nombre: '   ' }, { nombre: 3 }, { nombre: 'x'.repeat(61) }, null]) {
      expect(() => validarDatosCrearEquipo(cuerpo)).toThrow(ErrorValidacion)
    }
  })
})

describe('validarDatosActualizarEquipo', () => {
  it('acepta solo los campos presentes', () => {
    expect(validarDatosActualizarEquipo({ formaDeTrabajo: ' Reunión semanal ' })).toEqual({
      formaDeTrabajo: 'Reunión semanal',
    })
  })

  it('la cadena vacía y null borran un texto opcional', () => {
    expect(validarDatosActualizarEquipo({ descripcionActividad: '' })).toEqual({
      descripcionActividad: null,
    })
    expect(validarDatosActualizarEquipo({ descripcionActividad: null })).toEqual({
      descripcionActividad: null,
    })
  })

  it('exige al menos un cambio', () => {
    expect(() => validarDatosActualizarEquipo({})).toThrow(ErrorValidacion)
  })

  it('rechaza un campo inválido con su detalle, sin ignorarlo', () => {
    try {
      validarDatosActualizarEquipo({ nombre: '', formaDeTrabajo: 5 })
      expect.unreachable()
    } catch (error) {
      expect((error as ErrorValidacion).detallePorCampo).toHaveProperty('nombre')
      expect((error as ErrorValidacion).detallePorCampo).toHaveProperty('formaDeTrabajo')
    }
  })
})
