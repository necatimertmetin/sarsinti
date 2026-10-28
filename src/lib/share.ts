import type { Quake } from './types'
import { placeLabel } from './geo'
import { dateTime, fmtMag } from './format'

export function shareUrl(q: Quake): string {
  return `${location.origin}${location.pathname}#/deprem/${encodeURIComponent(q.id)}`
}

export function shareText(q: Quake): string {
  return `${fmtMag(q.mag)} büyüklüğünde deprem: ${placeLabel(q, q.region).text}, ${dateTime(q.time)}`
}
