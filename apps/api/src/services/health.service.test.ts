import { describe, expect, it } from 'vitest'
import { getHealthStatus } from './health.service.js'

describe('getHealthStatus', () => {
  it('reporta estado ok y acceso al paquete compartido', () => {
    expect(getHealthStatus()).toEqual({ status: 'ok', sharedPackageReady: true })
  })
})
