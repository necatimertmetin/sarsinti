import type { Quake } from './types'
import { placeLabel } from './geo'

const DAY = 86_400_000

/** Local-midnight key (YYYY-MM-DD) in Türkiye time (UTC+3, no DST). */
export function trDayKey(ms: number): string {
  return new Date(ms + 3 * 3_600_000).toISOString().slice(0, 10)
}

export interface DayBucket {
  day: string
  count: number
  maxMag: number
}

export function perDay(quakes: Quake[], days: number, now = Date.now()): DayBucket[] {
  const buckets = new Map<string, DayBucket>()
  for (let i = days - 1; i >= 0; i--) {
    const key = trDayKey(now - i * DAY)
    buckets.set(key, { day: key, count: 0, maxMag: 0 })
  }
  for (const q of quakes) {
    const b = buckets.get(trDayKey(q.time))
    if (b) {
      b.count++
      b.maxMag = Math.max(b.maxMag, q.mag)
    }
  }
  return [...buckets.values()]
}

export interface MagBucket {
  label: string
  from: number
  count: number
}

export function magnitudeHistogram(quakes: Quake[]): MagBucket[] {
  const edges = [0, 2, 3, 4, 5, 6]
  const out = edges.map((from, i) => ({
    from,
    label: i === edges.length - 1 ? `${from}+` : `${from}–${edges[i + 1]}`,
    count: 0,
  }))
  for (const q of quakes) {
    let i = edges.length - 1
    while (i > 0 && q.mag < edges[i]) i--
    out[i].count++
  }
  return out
}

export interface CityCount {
  city: string
  count: number
  maxMag: number
}

export function topCities(quakes: Quake[], n = 10): CityCount[] {
  const m = new Map<string, CityCount>()
  for (const q of quakes) {
    const p = placeLabel(q)
    if (!p.inTurkey) continue
    const c = m.get(p.city) ?? { city: p.city, count: 0, maxMag: 0 }
    c.count++
    c.maxMag = Math.max(c.maxMag, q.mag)
    m.set(p.city, c)
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.maxMag - a.maxMag).slice(0, n)
}

/**
 * Gutenberg–Richter b-value by maximum likelihood (Aki 1965), for events at or
 * above the completeness magnitude `mc`. Typical crustal values are near 1.
 */
export function bValue(quakes: Quake[], mc: number): number | null {
  const ms = quakes.filter((q) => q.mag >= mc).map((q) => q.mag)
  if (ms.length < 30) return null
  const mean = ms.reduce((s, x) => s + x, 0) / ms.length
  const dm = 0.1
  return Math.log10(Math.E) / (mean - (mc - dm / 2))
}

/** Seismic energy relative to a single M4 event (energy grows ~31.6x per magnitude). */
export function energyInM4(quakes: Quake[]): number {
  return quakes.reduce((s, q) => s + Math.pow(10, 1.5 * (q.mag - 4)), 0)
}
