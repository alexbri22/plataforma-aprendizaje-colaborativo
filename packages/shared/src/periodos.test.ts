import { describe, expect, it } from 'vitest'
import { generarPeriodos, LIMITE_PERIODOS } from './periodos.js'

const dia = (texto: string) => new Date(`${texto}T00:00:00.000Z`)
const comoTexto = (periodos: ReturnType<typeof generarPeriodos>) =>
  periodos.map((p) => [
    p.orden,
    p.fechaInicio.toISOString().slice(0, 10),
    p.fechaFin.toISOString().slice(0, 10),
  ])

describe('generarPeriodos', () => {
  it('semanal: periodos de siete días y el último recortado a la fecha de término', () => {
    const periodos = generarPeriodos(dia('2026-09-10'), dia('2026-11-01'), 'semanal')

    expect(periodos).toHaveLength(8)
    expect(comoTexto(periodos)[0]).toEqual([1, '2026-09-10', '2026-09-16'])
    expect(comoTexto(periodos)[7]).toEqual([8, '2026-10-29', '2026-11-01'])
  })

  it('quincenal: catorce días por periodo', () => {
    const periodos = generarPeriodos(dia('2026-09-01'), dia('2026-09-28'), 'quincenal')

    expect(comoTexto(periodos)).toEqual([
      [1, '2026-09-01', '2026-09-14'],
      [2, '2026-09-15', '2026-09-28'],
    ])
  })

  it('mensual: conserva el día del mes y usa el último día en meses más cortos, sin arrastrar el recorte', () => {
    const periodos = generarPeriodos(dia('2026-01-31'), dia('2026-04-30'), 'mensual')

    expect(comoTexto(periodos)).toEqual([
      [1, '2026-01-31', '2026-02-27'],
      [2, '2026-02-28', '2026-03-30'],
      [3, '2026-03-31', '2026-04-29'],
      [4, '2026-04-30', '2026-04-30'],
    ])
  })

  it('los periodos son consecutivos: cada uno empieza el día siguiente al fin del anterior', () => {
    for (const periodicidad of ['semanal', 'quincenal', 'mensual'] as const) {
      const periodos = generarPeriodos(dia('2026-08-17'), dia('2027-01-20'), periodicidad)

      for (let i = 1; i < periodos.length; i += 1) {
        const diaSiguiente = periodos[i - 1].fechaFin.getTime() + 24 * 60 * 60 * 1000
        expect(periodos[i].fechaInicio.getTime()).toBe(diaSiguiente)
      }
      expect(periodos[periodos.length - 1].fechaFin).toEqual(dia('2027-01-20'))
    }
  })

  it('un rango de un solo día produce un único periodo de un día', () => {
    const periodos = generarPeriodos(dia('2026-09-10'), dia('2026-09-10'), 'semanal')

    expect(comoTexto(periodos)).toEqual([[1, '2026-09-10', '2026-09-10']])
  })

  it('se detiene al pasar el límite en vez de generar miles de periodos', () => {
    const periodos = generarPeriodos(dia('2026-01-01'), dia('9999-12-31'), 'semanal')

    expect(periodos).toHaveLength(LIMITE_PERIODOS + 1)
  })
})
