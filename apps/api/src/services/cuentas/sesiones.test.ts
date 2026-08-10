import { describe, expect, it } from 'vitest'
import {
  calcularExpiracionAbsoluta,
  generarIdSesion,
  sesionInactivaDesde,
} from './sesiones.js'

describe('generarIdSesion', () => {
  it('genera identificadores distintos e impredecibles', () => {
    const primero = generarIdSesion()
    const segundo = generarIdSesion()
    expect(primero).not.toBe(segundo)
    expect(primero.length).toBeGreaterThanOrEqual(40)
  })
})

describe('calcularExpiracionAbsoluta', () => {
  it('coloca la expiración en el futuro respecto al punto de partida', () => {
    const desde = new Date('2026-01-01T00:00:00Z')
    const expiraEn = calcularExpiracionAbsoluta(desde)
    expect(expiraEn.getTime()).toBeGreaterThan(desde.getTime())
  })
})

describe('sesionInactivaDesde', () => {
  it('no marca inactiva una sesión con actividad reciente', () => {
    const ahora = new Date('2026-01-10T00:00:00Z')
    const ultimaActividad = new Date(ahora.getTime() - 60 * 60 * 1000)
    expect(sesionInactivaDesde(ultimaActividad, ahora)).toBe(false)
  })

  it('marca inactiva una sesión que superó el límite de horas configurado', () => {
    const ahora = new Date('2026-01-10T00:00:00Z')
    const ultimaActividad = new Date(ahora.getTime() - 24 * 30 * 60 * 60 * 1000)
    expect(sesionInactivaDesde(ultimaActividad, ahora)).toBe(true)
  })
})
