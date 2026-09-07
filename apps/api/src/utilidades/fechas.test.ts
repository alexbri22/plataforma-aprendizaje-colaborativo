import { describe, expect, it } from 'vitest'
import { finDeDiaEnCDMX } from './fechas.js'

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
