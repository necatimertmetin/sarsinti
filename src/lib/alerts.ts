import type { LatLon, Quake } from './types'
import { distanceKm, placeLabel } from './geo'
import { fmtMag } from './format'

export interface AlertSettings {
  enabled: boolean
  minMag: number
  /** Only alert for events within `radiusKm` of the saved place. */
  nearOnly: boolean
  radiusKm: number
  sound: boolean
}

export const DEFAULT_ALERTS: AlertSettings = { enabled: true, minMag: 4, nearOnly: false, radiusKm: 200, sound: false }

export function shouldAlert(q: Quake, s: AlertSettings, place: LatLon | null): boolean {
  if (!s.enabled || q.mag < s.minMag) return false
  if (s.nearOnly) return !!place && distanceKm(place, q) <= s.radiusKm
  return true
}

export function alertTitle(q: Quake): string {
  return `${fmtMag(q.mag)} büyüklüğünde deprem`
}

export function alertBody(q: Quake, place: LatLon | null): string {
  const where = placeLabel(q, q.region).text
  return place ? `${where} · sana ${Math.round(distanceKm(place, q))} km` : where
}

let ctx: AudioContext | null = null
export function beep() {
  try {
    ctx ??= new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.65)
  } catch {
    /* audio not available */
  }
}

export function systemNotify(q: Quake, place: LatLon | null, url: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const opts: NotificationOptions = { body: alertBody(q, place), tag: q.id, icon: 'icon-192.png' }
  // Prefer the service worker so it works on Android too.
  navigator.serviceWorker?.getRegistration().then((reg) => {
    if (reg) reg.showNotification(alertTitle(q), { ...opts, data: { url } })
    else new Notification(alertTitle(q), opts)
  })
}
