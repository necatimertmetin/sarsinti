import { TR_BOX, type Quake } from './types'
import { distanceKm } from './geo'

/* eslint-disable @typescript-eslint/no-explicit-any */

const EMSC = 'https://www.seismicportal.eu/fdsnws/event/1/query'
const USGS = 'https://earthquake.usgs.gov/fdsnws/event/1/query'
export const EMSC_WS = 'wss://www.seismicportal.eu/standing_order/websocket'

const isoNoZ = (ms: number) => new Date(ms).toISOString().slice(0, 19)

export function inBox(lat: number, lon: number): boolean {
  return lat >= TR_BOX.minLat && lat <= TR_BOX.maxLat && lon >= TR_BOX.minLon && lon <= TR_BOX.maxLon
}

export function parseEmscFeature(f: any): Quake | null {
  const p = f?.properties
  if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number' || typeof p.mag !== 'number') return null
  const time = Date.parse(p.time)
  if (Number.isNaN(time)) return null
  return {
    id: String(p.unid ?? f.id),
    time,
    lat: p.lat,
    lon: p.lon,
    depth: Math.abs(Number(p.depth) || 0),
    mag: Math.round(p.mag * 10) / 10,
    magType: String(p.magtype ?? '').toUpperCase(),
    agency: String(p.auth ?? 'EMSC'),
    region: String(p.flynn_region ?? ''),
    source: 'emsc',
  }
}

export function parseUsgsFeature(f: any): Quake | null {
  const p = f?.properties
  const c = f?.geometry?.coordinates
  if (!p || !Array.isArray(c) || typeof p.mag !== 'number') return null
  return {
    id: 'us-' + String(f.id),
    time: Number(p.time),
    lat: c[1],
    lon: c[0],
    depth: Math.abs(Number(c[2]) || 0),
    mag: Math.round(p.mag * 10) / 10,
    magType: String(p.magType ?? '').toUpperCase(),
    agency: String(p.net ?? 'us').toUpperCase(),
    region: String(p.place ?? '').replace(/^.* of /, ''),
    source: 'usgs',
  }
}

/** Newest first, duplicates (same event reported twice) removed. */
export function mergeQuakes(lists: Quake[][]): Quake[] {
  const byId = new Map<string, Quake>()
  for (const list of lists) for (const q of list) byId.set(q.id, q)
  const all = [...byId.values()].sort((a, b) => b.time - a.time)
  const out: Quake[] = []
  for (const q of all) {
    const dup = out.some(
      (o) => o.source !== q.source && Math.abs(o.time - q.time) < 60_000 && distanceKm(o, q) < 50,
    )
    if (!dup) out.push(q)
  }
  return out
}

export interface FetchOpts {
  startMs: number
  minMag: number
  signal?: AbortSignal
}

export async function fetchEmsc({ startMs, minMag, signal }: FetchOpts): Promise<Quake[]> {
  const qs = new URLSearchParams({
    format: 'json',
    limit: '6000',
    orderby: 'time',
    start: isoNoZ(startMs),
    minlat: String(TR_BOX.minLat),
    maxlat: String(TR_BOX.maxLat),
    minlon: String(TR_BOX.minLon),
    maxlon: String(TR_BOX.maxLon),
  })
  if (minMag > 0) qs.set('minmag', String(minMag))
  const res = await fetch(`${EMSC}?${qs}`, { signal })
  if (res.status === 204) return []
  if (!res.ok) throw new Error(`EMSC ${res.status}`)
  const json = await res.json()
  return (json.features ?? []).map(parseEmscFeature).filter((q: Quake | null): q is Quake => q !== null)
}

export async function fetchUsgs({ startMs, minMag, signal }: FetchOpts): Promise<Quake[]> {
  const qs = new URLSearchParams({
    format: 'geojson',
    orderby: 'time',
    starttime: isoNoZ(startMs),
    minlatitude: String(TR_BOX.minLat),
    maxlatitude: String(TR_BOX.maxLat),
    minlongitude: String(TR_BOX.minLon),
    maxlongitude: String(TR_BOX.maxLon),
    minmagnitude: String(Math.max(minMag, 2.5)),
  })
  const res = await fetch(`${USGS}?${qs}`, { signal })
  if (!res.ok) throw new Error(`USGS ${res.status}`)
  const json = await res.json()
  return (json.features ?? []).map(parseUsgsFeature).filter((q: Quake | null): q is Quake => q !== null)
}

export interface LoadResult {
  quakes: Quake[]
  source: 'emsc' | 'usgs'
}

/** EMSC (KOERI/AFAD solutions, small events too) first, USGS (M2.5+) if EMSC is down. */
export async function loadQuakes(opts: FetchOpts): Promise<LoadResult> {
  try {
    const quakes = await fetchEmsc(opts)
    return { quakes: mergeQuakes([quakes]), source: 'emsc' }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    const quakes = await fetchUsgs(opts)
    return { quakes: mergeQuakes([quakes]), source: 'usgs' }
  }
}

/** One event by id, for shared links that point outside the loaded range. */
export async function fetchEvent(id: string, signal?: AbortSignal): Promise<Quake | null> {
  if (id.startsWith('us-')) {
    const res = await fetch(`${USGS}?format=geojson&eventid=${encodeURIComponent(id.slice(3))}`, { signal })
    return res.ok ? parseUsgsFeature(await res.json()) : null
  }
  const res = await fetch(`${EMSC}?format=json&eventid=${encodeURIComponent(id)}`, { signal })
  if (!res.ok || res.status === 204) return null
  const json = await res.json()
  return parseEmscFeature(json.features ? json.features[0] : json)
}
