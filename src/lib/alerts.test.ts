import { describe, expect, it } from 'vitest'
import { DEFAULT_ALERTS, alertBody, shouldAlert } from './alerts'
import { planText } from './prepare'
import type { Quake } from './types'

const q: Quake = { id: 'a', time: 0, lat: 38.35, lon: 38.31, depth: 7, mag: 4.5, magType: 'ML', agency: 'AFAD', region: '', source: 'emsc' }
const istanbul = { lat: 41.0082, lon: 28.9784 }
const malatya = { lat: 38.3552, lon: 38.3095 }

describe('shouldAlert', () => {
  it('respects magnitude and on/off', () => {
    expect(shouldAlert(q, DEFAULT_ALERTS, null)).toBe(true)
    expect(shouldAlert({ ...q, mag: 3.2 }, DEFAULT_ALERTS, null)).toBe(false)
    expect(shouldAlert(q, { ...DEFAULT_ALERTS, enabled: false }, null)).toBe(false)
  })
  it('limits to nearby events when asked', () => {
    const s = { ...DEFAULT_ALERTS, nearOnly: true, radiusKm: 100 }
    expect(shouldAlert(q, s, malatya)).toBe(true)
    expect(shouldAlert(q, s, istanbul)).toBe(false)
    expect(shouldAlert(q, s, null)).toBe(false)
  })
  it('mentions the distance when a place is known', () => {
    expect(alertBody(q, istanbul)).toMatch(/sana \d+ km$/)
  })
})

describe('planText', () => {
  it('writes only the filled fields and always 112', () => {
    const t = planText({
      meetingPoint: 'Okul bahçesi',
      assemblyArea: '',
      outOfTownContact: '',
      notes: '',
      contacts: [{ name: 'Annem', phone: '0555' }],
    })
    expect(t).toContain('Buluşma noktası: Okul bahçesi')
    expect(t).not.toContain('Toplanma alanı')
    expect(t).toContain('• Annem 0555')
    expect(t).toContain('112')
  })
})
