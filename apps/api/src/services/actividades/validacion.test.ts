import { describe, expect, it } from 'vitest'
import { ErrorValidacion } from '../../errores.js'
import { validarDatosCrearActividad } from './validacion.js'

const DATOS_VALIDOS = {
  nombre: 'Club de robótica',
  objetivo: 'Construir un brazo robótico',
  informacionGeneral: 'Entregable en video, máximo 5 minutos.',
  fechaInicio: '2026-03-01',
  fechaTermino: '2026-04-01',
  fechaLimiteInscripcion: '2026-03-05',
  plazoCierreDias: 3,
  numeroEquiposEsperado: 4,
}

describe('validarDatosCrearActividad', () => {
  it('acepta datos válidos con fechas en formato YYYY-MM-DD', () => {
    const resultado = validarDatosCrearActividad(DATOS_VALIDOS)
    expect(resultado.fechaInicio.toISOString().slice(0, 10)).toBe('2026-03-01')
  })

  it('rechaza una fecha de calendario inexistente en vez de normalizarla', () => {
    try {
      validarDatosCrearActividad({ ...DATOS_VALIDOS, fechaInicio: '2026-02-30' })
      expect.fail('debía lanzar ErrorValidacion')
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorValidacion)
      expect((error as ErrorValidacion).detallePorCampo.fechaInicio).toBeDefined()
    }
  })

  it('rechaza formatos fuera del contrato YYYY-MM-DD, como un timestamp o datetime completo', () => {
    for (const valor of ['1772409600000', '2026-03-01T00:00:00.000Z', '03/01/2026']) {
      try {
        validarDatosCrearActividad({ ...DATOS_VALIDOS, fechaInicio: valor })
        expect.fail(`debía lanzar ErrorValidacion para "${valor}"`)
      } catch (error) {
        expect((error as ErrorValidacion).detallePorCampo.fechaInicio).toBeDefined()
      }
    }
  })

  it('rechaza un plazoCierreDias o numeroEquiposEsperado no enteros o no positivos', () => {
    try {
      validarDatosCrearActividad({
        ...DATOS_VALIDOS,
        plazoCierreDias: 0,
        numeroEquiposEsperado: 1.5,
      })
      expect.fail('debía lanzar ErrorValidacion')
    } catch (error) {
      const detalle = (error as ErrorValidacion).detallePorCampo
      expect(detalle.plazoCierreDias).toBeDefined()
      expect(detalle.numeroEquiposEsperado).toBeDefined()
    }
  })
})
