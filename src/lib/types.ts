export interface Quake {
  id: string
  /** Epoch ms */
  time: number
  lat: number
  lon: number
  /** km, positive down */
  depth: number
  mag: number
  magType: string
  /** Agency that located the event (KOERI, AFAD, EMSC, us...) */
  agency: string
  /** Region name as given by the source */
  region: string
  source: 'emsc' | 'usgs'
}

export interface LatLon {
  lat: number
  lon: number
}

export type RangeKey = '24h' | '7d' | '30d'

export const RANGE_HOURS: Record<RangeKey, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

/** Bounding box that covers Türkiye and a small margin around it. */
export const TR_BOX = { minLat: 35.5, maxLat: 42.5, minLon: 25.5, maxLon: 45 }
