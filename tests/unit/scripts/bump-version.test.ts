import { describe, expect, it } from 'vitest'
import { incrementPatchVersion } from '~~/scripts/version-utils.mjs'

describe('bump-version hook behavior', () => {
  it('uses patch version increments for commit versions', () => {
    expect(incrementPatchVersion('0.1.0')).toBe('0.1.1')
    expect(incrementPatchVersion('2.4.9')).toBe('2.4.10')
  })

  it('rejects unsupported version formats', () => {
    expect(() => incrementPatchVersion('0.1')).toThrow('Unsupported package version')
  })
})
