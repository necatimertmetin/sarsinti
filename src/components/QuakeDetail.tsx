import { useEffect, useState } from 'react'
import type { LatLon, Quake } from '../lib/types'
import { distanceKm, placeLabel } from '../lib/geo'
import { dateTime, fmtKm, fmtMag, relativeTime } from '../lib/format'
import { estimateMMI, intensityInfo, magColor, magLabel } from '../lib/intensity'
import { CITIES } from '../lib/cities'
import { shareText, shareUrl } from '../lib/share'

interface Props {
  quake: Quake
  all: Quake[]
  user?: LatLon | null
  onClose: () => void
}

export default function QuakeDetail({ quake: q, all, user, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const place = placeLabel(q, q.region)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const nearby = all.filter((o) => o.id !== q.id && distanceKm(o, q) <= 30)
  const nearbyBigger = nearby.filter((o) => o.mag > q.mag).length
  const userKm = user ? distanceKm(user, q) : null
  const userI = userKm !== null ? intensityInfo(estimateMMI(q.mag, userKm)) : null

  // Cities that probably felt it (estimated intensity III or more)
  const felt = CITIES.map((c) => ({ c, km: distanceKm(c, q) }))
    .map((x) => ({ ...x, i: intensityInfo(estimateMMI(q.mag, x.km)) }))
    .filter((x) => x.i.level >= 3)
    .sort((a, b) => a.km - b.km)
    .slice(0, 8)

  const share = async () => {
    const url = shareUrl(q)
    const text = shareText(q)
    if ('share' in navigator) {
      try {
        await navigator.share({ title: 'Sarsıntı', text, url })
        return
      } catch {
        /* cancelled: fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside className="sheet" role="dialog" aria-modal="true" aria-label="Deprem ayrıntısı" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Kapat">
          ×
        </button>
        <div className="detail-head">
          <div className="bigmag" style={{ background: magColor(q.mag) }}>
            <span>{fmtMag(q.mag)}</span>
            <small>{q.magType || 'M'}</small>
          </div>
          <div>
            <h2>{place.text}</h2>
            <p className="muted">
              {magLabel(q.mag)} · {dateTime(q.time)} ({relativeTime(q.time)})
            </p>
          </div>
        </div>

        <dl className="facts">
          <div>
            <dt>Derinlik</dt>
            <dd>{fmtKm(q.depth)}</dd>
          </div>
          <div>
            <dt>Koordinat</dt>
            <dd>
              {q.lat.toFixed(3)}, {q.lon.toFixed(3)}
            </dd>
          </div>
          <div>
            <dt>Kaynak</dt>
            <dd>{q.agency}</dd>
          </div>
          <div>
            <dt>Bölge</dt>
            <dd>{q.region || '—'}</dd>
          </div>
        </dl>

        {userI && userKm !== null && (
          <div className="callout" style={{ borderColor: userI.color }}>
            <strong>
              Sana uzaklığı {fmtKm(userKm)} · tahmini şiddet {userI.roman} ({userI.label})
            </strong>
            <p>{userI.description}</p>
          </div>
        )}

        {felt.length > 0 && (
          <section>
            <h3>Hissedilmiş olabilecek iller</h3>
            <ul className="felt">
              {felt.map(({ c, km, i }) => (
                <li key={c.name}>
                  <span className="dot" style={{ background: i.color }} />
                  {c.name} <span className="muted">· {fmtKm(km)} · {i.roman} {i.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="muted small">
          Seçili zaman aralığında 30 km çevresinde {nearby.length} deprem daha var
          {nearbyBigger ? `, ${nearbyBigger} tanesi bundan büyük` : ''}.
        </p>

        <div className="actions">
          <button className="btn primary" onClick={share}>
            {copied ? 'Kopyalandı' : 'Paylaş'}
          </button>
          <a
            className="btn"
            href={`https://www.openstreetmap.org/?mlat=${q.lat}&mlon=${q.lon}#map=10/${q.lat}/${q.lon}`}
            target="_blank"
            rel="noreferrer"
          >
            Haritada aç
          </a>
          {q.source === 'emsc' && (
            <a className="btn" href={`https://www.seismicportal.eu/eventdetails.html?unid=${encodeURIComponent(q.id)}`} target="_blank" rel="noreferrer">
              EMSC kaydı
            </a>
          )}
        </div>
        <p className="muted tiny">
          Şiddet değerleri Atkinson &amp; Wald (2007) bağıntısıyla hesaplanan kaba tahminlerdir; zemin ve bina durumuna göre
          gerçekte hissedilen farklı olabilir.
        </p>
      </aside>
    </div>
  )
}
