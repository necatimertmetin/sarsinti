import { CITIES, type City } from './cities'
import type { LatLon } from './types'

const R_EARTH = 6371
const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from a to b in degrees (0 = north, clockwise). */
export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

const DIRS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB']
const DIR_NAMES = ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı']

export function compass(deg: number): { short: string; long: string } {
  const i = Math.round(deg / 45) % 8
  return { short: DIRS[i], long: DIR_NAMES[i] }
}

export function nearestCity(p: LatLon): { city: City; km: number } {
  let best = CITIES[0]
  let bestKm = Infinity
  for (const c of CITIES) {
    const km = distanceKm(p, c)
    if (km < bestKm) {
      bestKm = km
      best = c
    }
  }
  return { city: best, km: bestKm }
}

/** Title-case an all-caps English region name from the source ("CENTRAL TURKEY" -> "Central Turkey"). */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-.(/])([a-z])/g, (_, p, c: string) => p + c.toUpperCase())
}

export interface PlaceLabel {
  /** Short, human label, e.g. "Malatya" */
  city: string
  /** Full sentence, e.g. "Malatya'nın 12 km kuzeybatısı" */
  text: string
  km: number
  inTurkey: boolean
}

/** Turkish genitive suffix after a proper noun, with apostrophe. */
export function genitive(name: string): string {
  const vowels = 'aeıioöuü'
  const lower = name.toLocaleLowerCase('tr')
  let last = ''
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.includes(lower[i])) {
      last = lower[i]
      break
    }
  }
  const endsWithVowel = vowels.includes(lower[lower.length - 1])
  const v = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' }[last] ?? 'i'
  return `${name}'${endsWithVowel ? 'n' : ''}${v}n`
}

/** Locative-ish direction phrase: "kuzeybatısı", "doğusu". */
function dirPossessive(long: string): string {
  if (long.endsWith('ı')) return long + 'sı'
  if (long.endsWith('u')) return long + 'su'
  return long + 'i' // kuzey -> kuzeyi, güney -> güneyi
}

export function placeLabel(p: LatLon, fallbackRegion = ''): PlaceLabel {
  const { city, km } = nearestCity(p)
  if (km > 150 && fallbackRegion) {
    return { city: titleCase(fallbackRegion), text: titleCase(fallbackRegion), km, inTurkey: false }
  }
  if (km < 5) return { city: city.name, text: `${city.name} merkez`, km, inTurkey: true }
  const dir = compass(bearing(city, p)).long
  return {
    city: city.name,
    text: `${genitive(city.name)} ${Math.round(km)} km ${dirPossessive(dir)}`,
    km,
    inTurkey: km <= 150,
  }
}
