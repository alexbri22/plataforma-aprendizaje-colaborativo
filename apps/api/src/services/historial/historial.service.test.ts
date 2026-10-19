import { describe, expect, it } from 'vitest'
import { limiteHistorialValido } from './historial.service.js'

// Tope del lado del servidor (nucleo §3.1): limite en la query de
// GET /historial puede pedir menos que el valor por defecto, nunca más que
// el máximo — el cliente propone, el servidor dispone.
describe('limiteHistorialValido', () => {
  it('sin límite pedido, usa el valor por defecto', () => {
    expect(limiteHistorialValido(undefined)).toBe(30)
  })

  it('un límite menor al máximo se respeta tal cual', () => {
    expect(limiteHistorialValido(5)).toBe(5)
  })

  it('un límite mayor al máximo se recorta al máximo', () => {
    expect(limiteHistorialValido(100000)).toBe(100)
  })

  it('un límite inválido (cero, negativo o no entero) cae al valor por defecto', () => {
    expect(limiteHistorialValido(0)).toBe(30)
    expect(limiteHistorialValido(-5)).toBe(30)
    expect(limiteHistorialValido(2.5)).toBe(30)
  })
})
