import { describe, expect, it } from 'vitest'
import { aFechaCalendario, finDeDiaEnCDMX, parsearFechaCalendario } from './fechas.js'

describe('finDeDiaEnCDMX', () => {
  it('para una fecha de calendario en UTC medianoche, cae a las 05:59:59.999 UTC del día siguiente', () => {
    const fecha = new Date('2026-09-15T00:00:00.000Z')
    const fin = finDeDiaEnCDMX(fecha)
    expect(fin.toISOString()).toBe('2026-09-16T05:59:59.999Z')
  })

  it('un instante justo antes del fin de día no cuenta como vencido', () => {
    const fecha = new Date('2026-09-15T00:00:00.000Z')
    const unMilisegundoAntes = new Date(finDeDiaEnCDMX(fecha).getTime() - 1)
    expect(unMilisegundoAntes.getTime() < finDeDiaEnCDMX(fecha).getTime()).toBe(true)
  })
})

describe('parsearFechaCalendario', () => {
  it('acepta YYYY-MM-DD y devuelve medianoche UTC', () => {
    expect(parsearFechaCalendario('2026-09-10')?.toISOString()).toBe('2026-09-10T00:00:00.000Z')
  })

  it('rechaza fechas inexistentes, otros formatos y valores que no son texto', () => {
    expect(parsearFechaCalendario('2026-02-30')).toBeUndefined()
    expect(parsearFechaCalendario('10/09/2026')).toBeUndefined()
    expect(parsearFechaCalendario('2026-09-10T12:00:00Z')).toBeUndefined()
    expect(parsearFechaCalendario(20260910)).toBeUndefined()
  })

  it('aFechaCalendario devuelve la fecha sin hora', () => {
    expect(aFechaCalendario(new Date('2026-09-10T00:00:00.000Z'))).toBe('2026-09-10')
  })
})
