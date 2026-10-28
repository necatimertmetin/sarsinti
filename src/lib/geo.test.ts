import { describe, expect, it } from 'vitest'
import { bearing, compass, distanceKm, genitive, nearestCity, placeLabel, titleCase } from './geo'
import { CITIES } from './cities'

describe('distanceKm', () => {
  it('measures Istanbul–Ankara at about 350 km', () => {
    const d = distanceKm({ lat: 41.0082, lon: 28.9784 }, { lat: 39.9334, lon: 32.8597 })
    expect(d).toBeGreaterThan(340)
    expect(d).toBeLessThan(360)
  })
  it('is zero for the same point', () => {
    expect(distanceKm({ lat: 38, lon: 35 }, { lat: 38, lon: 35 })).toBe(0)
  })
})

describe('bearing / compass', () => {
  it('points north, east and south-west correctly', () => {
    expect(compass(bearing({ lat: 38, lon: 35 }, { lat: 39, lon: 35 })).short).toBe('K')
    expect(compass(bearing({ lat: 38, lon: 35 }, { lat: 38, lon: 36 })).short).toBe('D')
    expect(compass(bearing({ lat: 38, lon: 35 }, { lat: 37, lon: 34 })).short).toBe('GB')
  })
})

describe('cities', () => {
  it('has all 81 provinces with unique names', () => {
    expect(CITIES).toHaveLength(81)
    expect(new Set(CITIES.map((c) => c.name)).size).toBe(81)
  })
  it('finds the nearest province centre', () => {
    expect(nearestCity({ lat: 38.4, lon: 38.3 }).city.name).toBe('Malatya')
    expect(nearestCity({ lat: 40.75, lon: 29.9 }).city.name).toBe('Kocaeli')
  })
})

describe('genitive', () => {
  it('follows vowel harmony', () => {
    expect(genitive('Malatya')).toBe("Malatya'nın")
    expect(genitive('Van')).toBe("Van'ın")
    expect(genitive('İzmir')).toBe("İzmir'in")
    expect(genitive('Bolu')).toBe("Bolu'nun")
    expect(genitive('Muş')).toBe("Muş'un")
    expect(genitive('Düzce')).toBe("Düzce'nin")
    expect(genitive('Kütahya')).toBe("Kütahya'nın")
  })
})

describe('placeLabel', () => {
  it('describes a point relative to the nearest province', () => {
    const p = placeLabel({ lat: 38.45, lon: 38.2 })
    expect(p.city).toBe('Malatya')
    expect(p.inTurkey).toBe(true)
    expect(p.text).toMatch(/^Malatya'nın \d+ km kuzeybatısı$/)
  })
  it('uses "güneyi" for due south', () => {
    expect(placeLabel({ lat: 39.6, lon: 32.86 }).text).toMatch(/^Ankara'nın \d+ km güneyi$/)
  })
  it('falls back to the source region far from any province', () => {
    const p = placeLabel({ lat: 35.6, lon: 25.6 }, 'CRETE, GREECE')
    expect(p.inTurkey).toBe(false)
    expect(p.text).toBe('Crete, Greece')
  })
  it('title-cases source names', () => {
    expect(titleCase('DODECANESE IS.-TURKEY BORDER REG')).toBe('Dodecanese Is.-Turkey Border Reg')
  })
})
