import { describe, expect, it } from 'vitest'
import { estimateMMI, intensityInfo, magColor } from './intensity'

describe('estimateMMI', () => {
  it('gives near-maximum shaking close to a M7.8', () => {
    expect(estimateMMI(7.8, 10)).toBeGreaterThan(9)
  })
  it('gives light shaking for a nearby M4', () => {
    const i = estimateMMI(4, 20)
    expect(i).toBeGreaterThan(2.5)
    expect(i).toBeLessThan(4.5)
  })
  it('decreases with distance and increases with magnitude', () => {
    expect(estimateMMI(5, 10)).toBeGreaterThan(estimateMMI(5, 100))
    expect(estimateMMI(6, 50)).toBeGreaterThan(estimateMMI(5, 50))
  })
  it('stays within 1..10', () => {
    expect(estimateMMI(1, 500)).toBe(1)
    expect(estimateMMI(9.5, 0)).toBe(10)
  })
})

describe('intensityInfo', () => {
  it('maps to roman numerals', () => {
    expect(intensityInfo(4.4).roman).toBe('IV')
    expect(intensityInfo(0.2).level).toBe(1)
    expect(intensityInfo(12).roman).toBe('X')
  })
  it('colors bigger magnitudes differently', () => {
    expect(magColor(5.5)).not.toBe(magColor(2.5))
  })
})
