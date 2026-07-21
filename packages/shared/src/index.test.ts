import { describe, expect, it } from 'vitest'
import { SHARED_PACKAGE_READY } from './index'

describe('packages/shared', () => {
  it('se exporta y es importable', () => {
    expect(SHARED_PACKAGE_READY).toBe(true)
  })
})
