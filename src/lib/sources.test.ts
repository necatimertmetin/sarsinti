import { afterEach, describe, expect, it, vi } from 'vitest'
import { inBox, loadQuakes, mergeQuakes, parseEmscFeature, parseUsgsFeature } from './sources'
import type { Quake } from './types'

const emsc = {
  type: 'Feature',
  id: '20261028_0000064',
  properties: {
    time: '2026-10-28T04:28:23.5Z',
    flynn_region: 'CENTRAL TURKEY',
    lat: 38.2223,
    lon: 36.3857,
    depth: 2.9,
    auth: 'KOERI',
    mag: 2.04,
    magtype: 'ml',
    unid: '20261028_0000064',
  },
}

const usgs = {
  type: 'Feature',
  id: 'us6000u4zm',
  properties: { mag: 4.4, place: '18 km E of Kentrí, Greece', time: 1793020802823, magType: 'mb', net: 'us' },
  geometry: { type: 'Point', coordinates: [25.9536, 35.0335, 10] },
}

const q = (over: Partial<Quake>): Quake => ({
  id: 'x',
  time: 0,
  lat: 38,
  lon: 35,
  depth: 5,
  mag: 3,
  magType: 'ML',
  agency: 'KOERI',
  region: '',
  source: 'emsc',
  ...over,
})

describe('parsers', () => {
  it('parses an EMSC feature', () => {
    const p = parseEmscFeature(emsc)!
    expect(p.id).toBe('20261028_0000064')
    expect(p.mag).toBe(2)
    expect(p.magType).toBe('ML')
    expect(p.time).toBe(Date.parse('2026-10-28T04:28:23.5Z'))
    expect(p.agency).toBe('KOERI')
  })
  it('parses a USGS feature', () => {
    const p = parseUsgsFeature(usgs)!
    expect(p.id).toBe('us-us6000u4zm')
    expect(p.lat).toBeCloseTo(35.0335)
    expect(p.region).toBe('Kentrí, Greece')
  })
  it('rejects broken input', () => {
    expect(parseEmscFeature({})).toBeNull()
    expect(parseEmscFeature({ properties: { lat: 1, lon: 2, mag: 3, time: 'nope' } })).toBeNull()
    expect(parseUsgsFeature(null)).toBeNull()
  })
})

describe('inBox', () => {
  it('accepts Türkiye and rejects far away points', () => {
    expect(inBox(39, 35)).toBe(true)
    expect(inBox(48, 2)).toBe(false)
  })
})

describe('mergeQuakes', () => {
  it('sorts newest first and keeps the latest version of an id', () => {
    const out = mergeQuakes([[q({ id: 'a', time: 1, mag: 2 }), q({ id: 'b', time: 5 })], [q({ id: 'a', time: 1, mag: 2.3 })]])
    expect(out.map((x) => x.id)).toEqual(['b', 'a'])
    expect(out[1].mag).toBe(2.3)
  })
  it('drops the same event reported by another source', () => {
    const out = mergeQuakes([[q({ id: 'a', time: 100_000 }), q({ id: 'us-a', time: 120_000, lat: 38.1, source: 'usgs' })]])
    expect(out).toHaveLength(1)
  })
  it('keeps two different events at the same place', () => {
    expect(mergeQuakes([[q({ id: 'a', time: 0 }), q({ id: 'b', time: 10_000 })]])).toHaveLength(2)
  })
})

describe('loadQuakes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses EMSC when it answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ features: [emsc] }), { status: 200 })))
    const r = await loadQuakes({ startMs: 0, minMag: 0 })
    expect(r.source).toBe('emsc')
    expect(r.quakes).toHaveLength(1)
  })

  it('falls back to USGS when EMSC fails', async () => {
    const f = vi.fn(async (url: string) =>
      url.includes('seismicportal')
        ? new Response('down', { status: 503 })
        : new Response(JSON.stringify({ features: [usgs] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', f)
    const r = await loadQuakes({ startMs: 0, minMag: 0 })
    expect(r.source).toBe('usgs')
    expect(r.quakes[0].id).toBe('us-us6000u4zm')
    expect(String(f.mock.calls[1][0])).toContain('minmagnitude=2.5')
  })

  it('treats 204 from EMSC as "no events"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    const r = await loadQuakes({ startMs: 0, minMag: 0 })
    expect(r.quakes).toEqual([])
  })
})
