import { useMemo, useState } from 'react'
import type { LatLon, Quake } from '../lib/types'
import { CITIES } from '../lib/cities'
import { distanceKm, nearestCity } from '../lib/geo'
import { estimateMMI, intensityInfo } from '../lib/intensity'
import { fmtKm, fmtMag, relativeTime } from '../lib/format'
import QuakeList from './QuakeList'

export interface SavedPlace extends LatLon {
  label: string
}

interface Props {
  quakes: Quake[]
  place: SavedPlace | null
  setPlace: (p: SavedPlace | null) => void
  radiusKm: number
  setRadiusKm: (n: number) => void
  rangeLabel: string
  selectedId: string | null
  onSelect: (id: string) => void
}

const RADII = [25, 50, 100, 200]

export default function NearMe({ quakes, place, setPlace, radiusKm, setRadiusKm, rangeLabel, selectedId, onSelect }: Props) {
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError('Tarayıcın konum özelliğini desteklemiyor. Listeden il seçebilirsin.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setPlace({ ...p, label: `Konumum (${nearestCity(p).city.name} yakını)` })
        setLocating(false)
      },
      () => {
        setGeoError('Konum alınamadı. İzin vermediysen listeden il seçebilirsin.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    )
  }

  const near = useMemo(() => {
    if (!place) return []
    return quakes.filter((q) => distanceKm(place, q) <= radiusKm)
  }, [quakes, place, radiusKm])

  const strongestFelt = useMemo(() => {
    if (!place || !near.length) return null
    let best = near[0]
    let bestI = 0
    for (const q of near) {
      const i = estimateMMI(q.mag, distanceKm(place, q))
      if (i > bestI) {
        bestI = i
        best = q
      }
    }
    return { q: best, info: intensityInfo(bestI) }
  }, [near, place])

  const biggest = near.reduce<Quake | null>((b, q) => (!b || q.mag > b.mag ? q : b), null)
  const closest = place ? near.reduce<Quake | null>((b, q) => (!b || distanceKm(place, q) < distanceKm(place, b) ? q : b), null) : null

  return (
    <div className="page">
      <section className="card">
        <h2>Yakınımdaki depremler</h2>
        <p className="muted">
          Konumun yalnızca bu cihazda saklanır, hiçbir yere gönderilmez.
        </p>
        <div className="row wrap">
          <button className="btn primary" onClick={locate} disabled={locating}>
            {locating ? 'Konum alınıyor…' : 'Konumumu kullan'}
          </button>
          <select
            aria-label="İl seç"
            value={place && CITIES.some((c) => c.name === place.label) ? place.label : ''}
            onChange={(e) => {
              const c = CITIES.find((x) => x.name === e.target.value)
              if (c) setPlace({ lat: c.lat, lon: c.lon, label: c.name })
            }}
          >
            <option value="">İl seç…</option>
            {[...CITIES].sort((a, b) => a.name.localeCompare(b.name, 'tr')).map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          {place && (
            <button className="btn ghost" onClick={() => setPlace(null)}>
              Konumu unut
            </button>
          )}
        </div>
        {geoError && <p className="warn">{geoError}</p>}
        <div className="chips" role="group" aria-label="Yarıçap">
          {RADII.map((r) => (
            <button key={r} className={'chip' + (r === radiusKm ? ' on' : '')} onClick={() => setRadiusKm(r)}>
              {r} km
            </button>
          ))}
        </div>
      </section>

      {place && (
        <>
          <section className="tiles">
            <div className="tile">
              <span className="tile-k">{near.length}</span>
              <span className="tile-l">
                deprem · {rangeLabel} · {radiusKm} km içinde
              </span>
            </div>
            <div className="tile">
              <span className="tile-k">{biggest ? fmtMag(biggest.mag) : '—'}</span>
              <span className="tile-l">en büyük{biggest ? ` · ${relativeTime(biggest.time)}` : ''}</span>
            </div>
            <div className="tile">
              <span className="tile-k">{closest ? fmtKm(distanceKm(place, closest)) : '—'}</span>
              <span className="tile-l">en yakın merkez üssü</span>
            </div>
          </section>
          {strongestFelt && (
            <div className="callout" style={{ borderColor: strongestFelt.info.color }}>
              <strong>
                {place.label} için en güçlü tahmini sarsıntı: {strongestFelt.info.roman} · {strongestFelt.info.label}
              </strong>
              <p>
                {fmtMag(strongestFelt.q.mag)} büyüklüğündeki deprem, {relativeTime(strongestFelt.q.time)}.{' '}
                {strongestFelt.info.description}
              </p>
            </div>
          )}
          <h3 className="section-title">{place.label} çevresi</h3>
          <QuakeList
            quakes={near}
            selectedId={selectedId}
            onSelect={onSelect}
            user={place}
            empty={`Bu aralıkta ${radiusKm} km içinde deprem kaydı yok. Yarıçapı ya da zaman aralığını büyütebilirsin.`}
          />
        </>
      )}
    </div>
  )
}
