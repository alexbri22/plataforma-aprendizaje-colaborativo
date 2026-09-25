import { describe, expect, it } from 'vitest'
import {
  barajarConSemilla,
  numeroEquiposDePropuesta,
  proponerEquipos,
  repartirEquilibrado,
  type EquipoParaReparto,
} from './reparto.js'

const personas = (n: number) => Array.from({ length: n }, (_, i) => `m${i + 1}`)

function tamanosFinales(equipos: EquipoParaReparto[], asignaciones: { idEquipo: string }[]) {
  return equipos.map((e) => e.integrantes + asignaciones.filter((a) => a.idEquipo === e.id).length)
}

// Menor tamaño posible del equipo mayor, por fuerza bruta: prueba todas las
// formas de repartir a las personas nuevas entre los equipos.
function menorMaximoPosible(iniciales: number[], nuevos: number): number {
  let mejor = Infinity
  const conteos = [...iniciales]
  const recorrer = (restantes: number) => {
    if (restantes === 0) {
      mejor = Math.min(mejor, Math.max(...conteos))
      return
    }
    for (let i = 0; i < conteos.length; i += 1) {
      conteos[i] += 1
      recorrer(restantes - 1)
      conteos[i] -= 1
    }
  }
  recorrer(nuevos)
  return mejor
}

describe('repartirEquilibrado', () => {
  it('reparte por turnos entre equipos vacíos, empatando por orden de creación', () => {
    const equipos = [
      { id: 'A', integrantes: 0 },
      { id: 'B', integrantes: 0 },
      { id: 'C', integrantes: 0 },
    ]
    const resultado = repartirEquilibrado(equipos, personas(7))
    expect(resultado.map((a) => a.idEquipo)).toEqual(['A', 'B', 'C', 'A', 'B', 'C', 'A'])
  })

  it('llena primero al equipo con menos integrantes y no mueve a quienes ya estaban', () => {
    const equipos = [
      { id: 'A', integrantes: 3 },
      { id: 'B', integrantes: 0 },
      { id: 'C', integrantes: 1 },
    ]
    const resultado = repartirEquilibrado(equipos, personas(4))
    expect(resultado.map((a) => a.idEquipo)).toEqual(['B', 'B', 'C', 'B'])
    expect(tamanosFinales(equipos, resultado)).toEqual([3, 3, 2])
  })

  it('conserva a cada persona una sola vez y en el orden recibido', () => {
    const resultado = repartirEquilibrado([{ id: 'A', integrantes: 0 }], personas(3))
    expect(resultado.map((a) => a.idMembresia)).toEqual(['m1', 'm2', 'm3'])
  })

  it('es determinista: mismos argumentos, mismo resultado', () => {
    const equipos = [
      { id: 'A', integrantes: 2 },
      { id: 'B', integrantes: 1 },
    ]
    expect(repartirEquilibrado(equipos, personas(5))).toEqual(
      repartirEquilibrado(equipos, personas(5)),
    )
  })

  it('no modifica los argumentos', () => {
    const equipos = [{ id: 'A', integrantes: 1 }]
    const nombres = personas(2)
    repartirEquilibrado(equipos, nombres)
    expect(equipos).toEqual([{ id: 'A', integrantes: 1 }])
    expect(nombres).toEqual(['m1', 'm2'])
  })

  it('minimiza el equipo mayor: coincide con la fuerza bruta en todos los casos pequeños', () => {
    for (let numEquipos = 1; numEquipos <= 3; numEquipos += 1) {
      const combinaciones = 4 ** numEquipos
      for (let codigo = 0; codigo < combinaciones; codigo += 1) {
        const iniciales = Array.from(
          { length: numEquipos },
          (_, i) => Math.floor(codigo / 4 ** i) % 4,
        )
        for (let nuevos = 0; nuevos <= 5; nuevos += 1) {
          const equipos = iniciales.map((integrantes, i) => ({ id: `E${i}`, integrantes }))
          const resultado = repartirEquilibrado(equipos, personas(nuevos))
          const maximo = Math.max(...tamanosFinales(equipos, resultado))
          expect(maximo, `${iniciales.join(',')} + ${nuevos}`).toBe(
            menorMaximoPosible(iniciales, nuevos),
          )
        }
      }
    }
  })

  it('sin nadie que repartir devuelve vacío, aunque no haya equipos', () => {
    expect(repartirEquilibrado([], [])).toEqual([])
  })

  it('con gente por repartir y ningún equipo, falla: quien llama debe impedirlo antes', () => {
    expect(() => repartirEquilibrado([], personas(1))).toThrow()
  })
})

describe('barajarConSemilla', () => {
  it('con la misma semilla produce el mismo orden', () => {
    expect(barajarConSemilla(personas(20), 42)).toEqual(barajarConSemilla(personas(20), 42))
  })

  it('con semillas distintas produce órdenes distintos', () => {
    const ordenes = new Set([1, 2, 3, 4, 5].map((s) => barajarConSemilla(personas(20), s).join()))
    expect(ordenes.size).toBeGreaterThan(1)
  })

  it('es una permutación: no pierde ni repite a nadie, y no modifica la entrada', () => {
    const entrada = personas(30)
    const salida = barajarConSemilla(entrada, 7)
    expect([...salida].sort()).toEqual([...entrada].sort())
    expect(entrada).toEqual(personas(30))
  })
})

describe('numeroEquiposDePropuesta', () => {
  it('es el esperado si alcanzan las personas, y tantos como personas si no', () => {
    expect(numeroEquiposDePropuesta(4, 10)).toBe(4)
    expect(numeroEquiposDePropuesta(4, 3)).toBe(3)
    expect(numeroEquiposDePropuesta(4, 0)).toBe(0)
  })
})

describe('proponerEquipos', () => {
  it('reparte a todos exactamente una vez, con tamaños que difieren a lo más en uno', () => {
    for (const [n, k] of [
      [10, 3],
      [7, 7],
      [1, 1],
      [13, 4],
    ]) {
      const equipos = proponerEquipos(personas(n), k, 99)
      expect(equipos).toHaveLength(k)
      expect(equipos.flat().sort()).toEqual(personas(n).sort())
      const tamanos = equipos.map((e) => e.length)
      expect(Math.max(...tamanos) - Math.min(...tamanos)).toBeLessThanOrEqual(1)
    }
  })

  it('es reproducible con la misma semilla y cambia con otra', () => {
    expect(proponerEquipos(personas(12), 3, 5)).toEqual(proponerEquipos(personas(12), 3, 5))
    const distintos = new Set(
      [1, 2, 3, 4, 5, 6].map((s) => JSON.stringify(proponerEquipos(personas(12), 3, s))),
    )
    expect(distintos.size).toBeGreaterThan(1)
  })
})
