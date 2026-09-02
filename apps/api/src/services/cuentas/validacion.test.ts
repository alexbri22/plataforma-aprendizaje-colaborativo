import { describe, expect, it } from 'vitest'
import { ErrorValidacion } from '../../errores.js'
import { validarCredenciales, validarDatosRegistro } from './validacion.js'

const DATOS_VALIDOS = {
  nombre: 'Ada',
  apellidoPaterno: 'Lovelace',
  apellidoMaterno: 'Byron',
  nivelEstudios: 'Licenciatura',
  institucionEducativa: 'UNAM',
  correo: 'ada@ejemplo.com',
  contrasena: 'contrasena-larga',
}

describe('validarDatosRegistro', () => {
  it('acepta datos válidos y normaliza el correo requerido', () => {
    const resultado = validarDatosRegistro(DATOS_VALIDOS)
    expect(resultado.nivelEstudios).toBe('licenciatura')
    expect(resultado.correo).toBe('ada@ejemplo.com')
  })

  it('acepta la etiqueta con espacios de "preparatoria o bachillerato"', () => {
    const resultado = validarDatosRegistro({
      ...DATOS_VALIDOS,
      nivelEstudios: 'Preparatoria o bachillerato',
    })
    expect(resultado.nivelEstudios).toBe('preparatoria_o_bachillerato')
  })

  it('acepta también el valor ya normalizado del catálogo', () => {
    const resultado = validarDatosRegistro({ ...DATOS_VALIDOS, nivelEstudios: 'posgrado' })
    expect(resultado.nivelEstudios).toBe('posgrado')
  })

  it('rechaza un nivel de estudios que no está en el catálogo', () => {
    try {
      validarDatosRegistro({ ...DATOS_VALIDOS, nivelEstudios: 'doctorado' })
      expect.fail('debía lanzar ErrorValidacion')
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorValidacion)
      expect((error as ErrorValidacion).detallePorCampo.nivelEstudios).toBeDefined()
    }
  })

  it('rechaza una contraseña de menos de ocho caracteres', () => {
    try {
      validarDatosRegistro({ ...DATOS_VALIDOS, contrasena: 'corta' })
      expect.fail('debía lanzar ErrorValidacion')
    } catch (error) {
      expect((error as ErrorValidacion).detallePorCampo.contrasena).toBeDefined()
    }
  })

  it('rechaza un correo mal formado', () => {
    try {
      validarDatosRegistro({ ...DATOS_VALIDOS, correo: 'no-es-un-correo' })
      expect.fail('debía lanzar ErrorValidacion')
    } catch (error) {
      expect((error as ErrorValidacion).detallePorCampo.correo).toBeDefined()
    }
  })

  it('acumula un detalle por cada campo requerido ausente', () => {
    try {
      validarDatosRegistro({})
      expect.fail('debía lanzar ErrorValidacion')
    } catch (error) {
      const detalle = (error as ErrorValidacion).detallePorCampo
      expect(Object.keys(detalle).sort()).toEqual(
        [
          'apellidoMaterno',
          'apellidoPaterno',
          'contrasena',
          'correo',
          'institucionEducativa',
          'nivelEstudios',
          'nombre',
        ].sort(),
      )
    }
  })
})

describe('validarCredenciales', () => {
  it('acepta correo y contraseña presentes', () => {
    const resultado = validarCredenciales({ correo: 'ada@ejemplo.com', contrasena: 'x' })
    expect(resultado).toEqual({ correo: 'ada@ejemplo.com', contrasena: 'x' })
  })

  it('rechaza credenciales sin correo ni contraseña', () => {
    try {
      validarCredenciales({})
      expect.fail('debía lanzar ErrorValidacion')
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorValidacion)
      const detalle = (error as ErrorValidacion).detallePorCampo
      expect(detalle.correo).toBeDefined()
      expect(detalle.contrasena).toBeDefined()
    }
  })
})
