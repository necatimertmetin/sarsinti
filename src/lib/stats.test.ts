import { describe, expect, it } from 'vitest'
import { bValue, energyInM4, magnitudeHistogram, perDay, topCities, trDayKey } from './stats'
import type { Quake } from './types'

const mk = (mag: number, time: number, lat = 38.35, lon = 38.31): Quake => ({
  id: `${mag}-${time}-${lat}`,
  time,
  lat,
  lon,
  depth: 7,
  mag,
  magType: 'ML',
  agency: 'KOERI',
  region: '',
  source: 'emsc',
})

describe('trDayKey', () => {
  it('uses Türkiye time (UTC+3)', () => {
    expect(trDayKey(Date.parse('2026-10-27T22:30:00Z'))).toBe('2026-10-28')
    expect(trDayKey(Date.parse('2026-10-27T20:30:00Z'))).toBe('2026-10-27')
  })
})

describe('perDay', () => {
  it('buckets events into days and keeps the max magnitude', () => {
    const now = Date.parse('2026-10-28T09:00:00Z')
    const days = perDay([mk(2, now), mk(4.1, now - 3_600_000), mk(3, now - 86_400_000)], 3, now)
    expect(days).toHaveLength(3)
    expect(days[2]).toMatchObject({ day: '2026-10-28', count: 2, maxMag: 4.1 })
    expect(days[1].count).toBe(1)
    expect(days[0].count).toBe(0)
  })
})

describe('magnitudeHistogram', () => {
  it('puts each event in exactly one bucket', () => {
    const h = magnitudeHistogram([mk(1.5, 0), mk(2, 0), mk(2.9, 0), mk(4.2, 0), mk(6.8, 0)])
    expect(h.map((x) => x.count)).toEqual([1, 2, 0, 1, 0, 1])
  })
})

describe('topCities', () => {
  it('ranks provinces by count and skips far-away events', () => {
    const list = [mk(2, 0), mk(3, 1), mk(2.5, 2, 39.93, 32.86), mk(5, 3, 35.6, 25.6)]
    const top = topCities(list)
    expect(top[0]).toMatchObject({ city: 'Malatya', count: 2, maxMag: 3 })
    expect(top).toHaveLength(2)
  })
})

describe('bValue', () => {
  it('needs enough events', () => {
    expect(bValue([mk(3, 0)], 2.5)).toBeNull()
  })
  it('is close to 1 for a Gutenberg–Richter sample', () => {
    const qs: Quake[] = []
    for (let i = 0; i <= 35; i++) {
      const m = Math.round((2.5 + i * 0.1) * 10) / 10
      const n = Math.round(1000 * Math.pow(10, -(m - 2.5)))
      for (let k = 0; k < n; k++) qs.push(mk(m, k))
    }
    const b = bValue(qs, 2.5)!
    expect(b).toBeGreaterThan(0.85)
    expect(b).toBeLessThan(1.15)
  })
})

describe('energyInM4', () => {
  it('counts one M5 as about 31.6 M4s', () => {
    expect(energyInM4([mk(5, 0)])).toBeCloseTo(31.62, 1)
    expect(energyInM4([mk(4, 0), mk(4, 1)])).toBeCloseTo(2)
  })
})
