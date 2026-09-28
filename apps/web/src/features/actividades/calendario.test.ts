import type { PeriodoReporte } from '@plataforma/shared'
import { describe, expect, it } from 'vitest'
import { inferirPeriodicidad, resumirCalendario } from './calendario'

function periodo(orden: number, fechaInicio: string, fechaFin: string, estado = 'activo') {
  return { id: `p${orden}`, orden, fechaInicio, fechaFin, estado } as PeriodoReporte
}

const SEMANAL = [
  periodo(1, '2026-09-10', '2026-09-16'),
  periodo(2, '2026-09-17', '2026-09-23'),
  periodo(3, '2026-09-24', '2026-09-30'),
  periodo(4, '2026-10-01', '2026-10-03'),
]

describe('inferirPeriodicidad', () => {
  it('sin periodos no hay calendario', () => {
    expect(inferirPeriodicidad([])).toBe('ninguna')
  })

  it('reconoce un calendario semanal con el último periodo recortado', () => {
    expect(inferirPeriodicidad(SEMANAL)).toBe('semanal')
  })

  it('reconoce quincenal y mensual', () => {
    expect(
      inferirPeriodicidad([
        periodo(1, '2026-09-01', '2026-09-14'),
        periodo(2, '2026-09-15', '2026-09-28'),
      ]),
    ).toBe('quincenal')
    expect(
      inferirPeriodicidad([
        periodo(1, '2026-09-10', '2026-10-09'),
        periodo(2, '2026-10-10', '2026-11-09'),
        periodo(3, '2026-11-10', '2026-11-30'),
      ]),
    ).toBe('mensual')
  })

  // Lo que el servidor genera al anclar en el día 31: cada inicio se calcula
  // desde el primero (31 ene, 28 feb, 31 mar, 30 abr), no encadenando meses.
  it('reconoce el mensual anclado en un día 31, con sus recortes', () => {
    expect(
      inferirPeriodicidad([
        periodo(1, '2026-01-31', '2026-02-27'),
        periodo(2, '2026-02-28', '2026-03-30'),
        periodo(3, '2026-03-31', '2026-04-29'),
        periodo(4, '2026-04-30', '2026-04-30'),
      ]),
    ).toBe('mensual')
  })

  it('no toma por mensual lo que solo tiene duraciones de un mes pero el servidor no generaría', () => {
    // Cada periodo dura entre 28 y 31 días y no hay huecos, pero el tercero
    // debería terminar el 29 de abril y dar paso a un cuarto: elegir
    // "Mensual" produciría otro calendario, así que no es un mensual.
    expect(
      inferirPeriodicidad([
        periodo(1, '2026-01-31', '2026-02-27'),
        periodo(2, '2026-02-28', '2026-03-30'),
        periodo(3, '2026-03-31', '2026-04-30'),
      ]),
    ).toBe('personalizada')
  })

  it('un periodo cancelado no cambia la periodicidad: conserva sus fechas', () => {
    const conCancelado = SEMANAL.map((p) =>
      p.orden === 2 ? { ...p, estado: 'cancelado' as const } : p,
    )
    expect(inferirPeriodicidad(conCancelado)).toBe('semanal')
  })

  it('un ajuste manual de fechas vuelve el calendario personalizado', () => {
    const movido = SEMANAL.map((p) => (p.orden === 1 ? { ...p, fechaFin: '2026-09-14' } : p))
    expect(inferirPeriodicidad(movido)).toBe('personalizada')
  })

  it('un solo periodo no permite deducir la periodicidad', () => {
    expect(inferirPeriodicidad([periodo(1, '2026-09-10', '2026-09-16')])).toBe('personalizada')
  })
})

describe('resumirCalendario', () => {
  it('abarca solo los periodos activos', () => {
    const periodos = SEMANAL.map((p) =>
      p.orden === 1 || p.orden === 4 ? { ...p, estado: 'cancelado' as const } : p,
    )

    expect(resumirCalendario(periodos)).toEqual({
      inicio: '2026-09-17',
      fin: '2026-09-30',
      activos: 2,
      cancelados: 2,
    })
  })

  it('sin periodos activos no hay fechas', () => {
    expect(resumirCalendario([])).toEqual({ inicio: null, fin: null, activos: 0, cancelados: 0 })
  })
})
