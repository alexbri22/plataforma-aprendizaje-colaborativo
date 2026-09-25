import { describe, expect, it } from 'vitest'
import {
  barajarConSemilla,
  numeroEquiposDePropuesta,
  proponerEquipos,
  repartirConMaximo,
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

describe('numeroEquiposDePropuesta con máximo', () => {
  it('crea los equipos que hagan falta para que todos quepan', () => {
    expect(numeroEquiposDePropuesta(3, 12, 3)).toBe(4)
    expect(numeroEquiposDePropuesta(3, 12, 4)).toBe(3)
    expect(numeroEquiposDePropuesta(3, 12, null)).toBe(3)
    expect(numeroEquiposDePropuesta(5, 2, 3)).toBe(2)
    expect(numeroEquiposDePropuesta(3, 0, 3)).toBe(0)
  })

  it('la propuesta resultante respeta el máximo', () => {
    for (const [n, esperado, maximo] of [
      [12, 3, 3],
      [10, 2, 4],
      [7, 7, 2],
      [1, 1, 1],
    ]) {
      const equipos = proponerEquipos(personas(n), numeroEquiposDePropuesta(esperado, n, maximo), 3)
      expect(Math.max(...equipos.map((e) => e.length))).toBeLessThanOrEqual(maximo)
      expect(equipos.flat()).toHaveLength(n)
    }
  })
})

describe('repartirConMaximo', () => {
  it('sin máximo es exactamente el reparto equilibrado', () => {
    const equipos = [
      { id: 'A', integrantes: 2 },
      { id: 'B', integrantes: 0 },
    ]
    expect(repartirConMaximo(equipos, personas(4), null)).toEqual({
      asignaciones: repartirEquilibrado(equipos, personas(4)),
      equiposNuevos: [],
    })
  })

  it('si caben todos no crea equipos', () => {
    const equipos = [
      { id: 'A', integrantes: 1 },
      { id: 'B', integrantes: 0 },
    ]
    const resultado = repartirConMaximo(equipos, personas(3), 2)
    expect(resultado.equiposNuevos).toEqual([])
    expect(tamanosFinales(equipos, resultado.asignaciones)).toEqual([2, 2])
  })

  it('crea un equipo solo cuando todos están llenos, y lo llena antes de crear otro', () => {
    const equipos = [
      { id: 'A', integrantes: 2 },
      { id: 'B', integrantes: 2 },
    ]
    const resultado = repartirConMaximo(equipos, personas(5), 2)
    expect(resultado.equiposNuevos).toEqual(['nuevo-1', 'nuevo-2', 'nuevo-3'])
    expect(resultado.asignaciones.map((a) => a.idEquipo)).toEqual([
      'nuevo-1',
      'nuevo-1',
      'nuevo-2',
      'nuevo-2',
      'nuevo-3',
    ])
  })

  it('nunca supera el máximo y crea el mínimo de equipos, contra fuerza bruta', () => {
    for (let maximo = 1; maximo <= 3; maximo += 1) {
      for (let a = 0; a <= maximo; a += 1) {
        for (let b = 0; b <= maximo; b += 1) {
          for (let nuevos = 0; nuevos <= 7; nuevos += 1) {
            const equipos = [
              { id: 'A', integrantes: a },
              { id: 'B', integrantes: b },
            ]
            const r = repartirConMaximo(equipos, personas(nuevos), maximo)
            const capacidadLibre = Math.max(0, maximo - a) + Math.max(0, maximo - b)
            const faltan = Math.max(0, nuevos - capacidadLibre)
            expect(r.equiposNuevos.length, `${a},${b}+${nuevos}/${maximo}`).toBe(
              Math.ceil(faltan / maximo),
            )
            const conteo = new Map<string, number>()
            for (const x of r.asignaciones)
              conteo.set(x.idEquipo, (conteo.get(x.idEquipo) ?? 0) + 1)
            expect((conteo.get('A') ?? 0) + a).toBeLessThanOrEqual(Math.max(maximo, a))
            expect((conteo.get('B') ?? 0) + b).toBeLessThanOrEqual(Math.max(maximo, b))
            for (const id of r.equiposNuevos)
              expect(conteo.get(id) ?? 0).toBeLessThanOrEqual(maximo)
          }
        }
      }
    }
  })

  it('un equipo que ya excede el máximo cuenta como lleno y no se toca', () => {
    const r = repartirConMaximo([{ id: 'A', integrantes: 5 }], personas(1), 3)
    expect(r.equiposNuevos).toEqual(['nuevo-1'])
    expect(r.asignaciones).toEqual([{ idMembresia: 'm1', idEquipo: 'nuevo-1' }])
  })

  it('es determinista', () => {
    const equipos = [{ id: 'A', integrantes: 1 }]
    expect(repartirConMaximo(equipos, personas(6), 2)).toEqual(
      repartirConMaximo(equipos, personas(6), 2),
    )
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
