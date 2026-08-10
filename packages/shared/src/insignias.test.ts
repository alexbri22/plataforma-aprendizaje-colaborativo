import { describe, expect, it } from 'vitest'
import {
  CATALOGO_INSIGNIAS,
  CATEGORIAS_INSIGNIA,
  MAXIMO_RECONOCIMIENTOS,
  NIVELES,
  definicionCategoria,
  definicionNivel,
  nivelParaPuntos,
  progresoDeNivel,
  reconocimientosDisponibles,
} from './insignias'

describe('catálogo de insignias', () => {
  it('tiene una definición por cada categoría, sin sobrantes', () => {
    expect(CATALOGO_INSIGNIAS.map((c) => c.id)).toEqual([...CATEGORIAS_INSIGNIA])
  })

  it('resuelve la definición de una categoría', () => {
    expect(definicionCategoria('buen-juicio').nombre).toBe('Buen juicio')
  })
})

describe('escala de niveles', () => {
  it('conserva los umbrales acordados', () => {
    expect(NIVELES.map((n) => [n.id, n.puntosMinimos])).toEqual([
      ['bronce', 3],
      ['plata', 8],
      ['oro', 18],
      ['platino', 35],
      ['diamante', 60],
    ])
  })

  it('está ordenada de forma estrictamente ascendente', () => {
    const umbrales = NIVELES.map((n) => n.puntosMinimos)
    expect(umbrales).toEqual([...umbrales].sort((a, b) => a - b))
    expect(new Set(umbrales).size).toBe(umbrales.length)
  })

  it('resuelve la definición de un nivel', () => {
    expect(definicionNivel('oro').nombre).toBe('Oro')
  })
})

describe('nivelParaPuntos', () => {
  it('no otorga nivel por debajo del primer umbral', () => {
    expect(nivelParaPuntos(0)).toBeNull()
    expect(nivelParaPuntos(2)).toBeNull()
  })

  it('otorga el nivel justo al alcanzar su umbral', () => {
    expect(nivelParaPuntos(3)).toBe('bronce')
    expect(nivelParaPuntos(8)).toBe('plata')
    expect(nivelParaPuntos(18)).toBe('oro')
    expect(nivelParaPuntos(35)).toBe('platino')
    expect(nivelParaPuntos(60)).toBe('diamante')
  })

  it('conserva el nivel entre umbrales y no lo pierde al excederlo', () => {
    expect(nivelParaPuntos(7)).toBe('bronce')
    expect(nivelParaPuntos(34)).toBe('oro')
    expect(nivelParaPuntos(999)).toBe('diamante')
  })

  it('admite fracciones, que es como aportan las señales automáticas', () => {
    expect(nivelParaPuntos(2.5)).toBeNull()
    expect(nivelParaPuntos(3.5)).toBe('bronce')
  })
})

describe('progresoDeNivel', () => {
  it('apunta al primer umbral cuando aún no hay nivel', () => {
    const progreso = progresoDeNivel(0)
    expect(progreso.nivel).toBeNull()
    expect(progreso.siguiente?.id).toBe('bronce')
    expect(progreso.puntosRestantes).toBe(3)
    expect(progreso.fraccion).toBe(0)
  })

  it('mide el avance dentro del tramo actual', () => {
    // Bronce (3) → Plata (8): un tramo de 5 puntos, con 2 recorridos.
    const progreso = progresoDeNivel(5)
    expect(progreso.nivel).toBe('bronce')
    expect(progreso.siguiente?.id).toBe('plata')
    expect(progreso.puntosRestantes).toBe(3)
    expect(progreso.fraccion).toBeCloseTo(0.4)
  })

  it('se satura en el nivel máximo', () => {
    const progreso = progresoDeNivel(60)
    expect(progreso.nivel).toBe('diamante')
    expect(progreso.siguiente).toBeNull()
    expect(progreso.puntosRestantes).toBe(0)
    expect(progreso.fraccion).toBe(1)
  })
})

describe('reconocimientosDisponibles', () => {
  it('reproduce los ejemplos acordados', () => {
    expect(reconocimientosDisponibles(3)).toBe(1)
    expect(reconocimientosDisponibles(10)).toBe(3)
    expect(reconocimientosDisponibles(20)).toBe(5)
  })

  it('nunca alcanza para todo el equipo, que es el punto de la regla', () => {
    for (let tamano = 3; tamano <= 30; tamano += 1) {
      expect(reconocimientosDisponibles(tamano)).toBeLessThan(tamano - 1)
    }
  })

  it('respeta el piso de uno y el techo de cinco', () => {
    expect(reconocimientosDisponibles(2)).toBe(1)
    expect(reconocimientosDisponibles(4)).toBe(1)
    expect(reconocimientosDisponibles(100)).toBe(MAXIMO_RECONOCIMIENTOS)
  })

  it('no reparte nada cuando no hay a quién', () => {
    expect(reconocimientosDisponibles(1)).toBe(0)
    expect(reconocimientosDisponibles(0)).toBe(0)
  })
})
