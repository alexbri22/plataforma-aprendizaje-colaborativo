import { describe, expect, it } from 'vitest'
import { ALFABETO_FOLIO, normalizarFolio } from './index.js'

describe('normalizarFolio', () => {
  it('acepta un folio válido y lo devuelve tal cual', () => {
    expect(normalizarFolio('CO3-7KQM-4XPA')).toBe('CO3-7KQM-4XPA')
  })

  it('acepta minúsculas y espacios alrededor, como llega escrito a mano', () => {
    expect(normalizarFolio('  co3-7kqm-4xpa ')).toBe('CO3-7KQM-4XPA')
  })

  it.each(['CO3-7KQM-4XP', 'CO3-7KQM-4XPAA', 'CO4-7KQM-4XPA', 'CO37KQM4XPA', 'CO3-7KQM-4XP!', ''])(
    'rechaza "%s" por su forma',
    (valor) => {
      expect(normalizarFolio(valor)).toBeNull()
    },
  )

  // I, L, O y U no existen en el alfabeto de Crockford: un folio con ellas no
  // pudo haberse emitido.
  it.each(['I', 'L', 'O', 'U'])('rechaza la letra %s, que el alfabeto no usa', (letra) => {
    expect(normalizarFolio(`CO3-7KQM-4XP${letra}`)).toBeNull()
  })

  it('el alfabeto tiene 32 caracteres distintos y ninguno se confunde', () => {
    expect(new Set(ALFABETO_FOLIO).size).toBe(32)
    expect(ALFABETO_FOLIO).not.toMatch(/[ILOU]/)
  })
})
