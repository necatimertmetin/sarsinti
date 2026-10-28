import { useMemo, useState } from 'react'
import { useQuakeHistory } from '../hooks/useQuakes'
import { bValue, energyInM4, magnitudeHistogram, perDay, topCities } from '../lib/stats'
import { fmtInt, fmtMag, relativeTime, shortDay } from '../lib/format'
import { placeLabel } from '../lib/geo'
import { magColor } from '../lib/intensity'

interface Props {
  onSelect: (id: string) => void
}

const DAYS = 30
const MIN_MAG = 2

export default function Stats({ onSelect }: Props) {
  const { quakes, loading, error } = useQuakeHistory(DAYS, MIN_MAG, true)
  const [hover, setHover] = useState<number | null>(null)

  const days = useMemo(() => perDay(quakes, DAYS), [quakes])
  const hist = useMemo(() => magnitudeHistogram(quakes), [quakes])
  const cities = useMemo(() => topCities(quakes, 10), [quakes])
  const biggest = useMemo(() => [...quakes].sort((a, b) => b.mag - a.mag).slice(0, 5), [quakes])
  const b = useMemo(() => bValue(quakes, 2.5), [quakes])
  const energy = useMemo(() => energyInM4(quakes), [quakes])

  if (loading) return <div className="page"><p className="empty">Son 30 günün verileri yükleniyor…</p></div>
  if (error) return <div className="page"><p className="warn">{error}</p></div>

  const maxDay = Math.max(1, ...days.map((d) => d.count))
  const maxHist = Math.max(1, ...hist.map((h) => h.count))
  const maxCity = Math.max(1, ...cities.map((c) => c.count))
  const h = hover !== null ? days[hover] : null

  return (
    <div className="page">
      <section className="tiles">
        <div className="tile">
          <span className="tile-k">{fmtInt(quakes.length)}</span>
          <span className="tile-l">deprem (M{MIN_MAG}+), son {DAYS} gün</span>
        </div>
        <div className="tile">
          <span className="tile-k">{fmtInt(Math.round(quakes.length / DAYS))}</span>
          <span className="tile-l">günlük ortalama</span>
        </div>
        <div className="tile">
          <span className="tile-k">{fmtInt(Math.round(energy))}×</span>
          <span className="tile-l">toplam enerji, bir M4 depremine göre</span>
        </div>
        <div className="tile">
          <span className="tile-k">{b ? b.toFixed(2).replace('.', ',') : '—'}</span>
          <span className="tile-l">b-değeri (Gutenberg–Richter)</span>
        </div>
      </section>

      <section className="card">
        <h3>Günlük deprem sayısı</h3>
        <p className="muted small">{h ? `${shortDay(h.day)}: ${h.count} deprem, en büyüğü ${fmtMag(h.maxMag)}` : 'Bir çubuğun üzerine gel ya da dokun.'}</p>
        <div className="bars" onMouseLeave={() => setHover(null)}>
          {days.map((d, i) => (
            <button
              key={d.day}
              className={'bar' + (hover === i ? ' on' : '')}
              style={{ height: `${Math.max(2, (d.count / maxDay) * 100)}%`, background: magColor(d.maxMag) }}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`${shortDay(d.day)}: ${d.count} deprem`}
            />
          ))}
        </div>
        <div className="bars-axis">
          <span>{shortDay(days[0].day)}</span>
          <span>{shortDay(days[days.length - 1].day)}</span>
        </div>
      </section>

      <div className="two">
        <section className="card">
          <h3>Büyüklük dağılımı</h3>
          <ul className="hbars">
            {hist.filter((x) => x.from >= MIN_MAG).map((x) => (
              <li key={x.label}>
                <span className="hb-l">M {x.label}</span>
                <span className="hb-t">
                  <span className="hb-f" style={{ width: `${(x.count / maxHist) * 100}%`, background: magColor(x.from) }} />
                </span>
                <span className="hb-v">{fmtInt(x.count)}</span>
              </li>
            ))}
          </ul>
          <p className="muted tiny">
            Her büyüklük basamağında deprem sayısı yaklaşık 10 kat azalır; b-değeri bu oranı ölçer (genelde 1 civarı).
          </p>
        </section>

        <section className="card">
          <h3>En hareketli iller</h3>
          <ul className="hbars">
            {cities.map((c) => (
              <li key={c.city}>
                <span className="hb-l">{c.city}</span>
                <span className="hb-t">
                  <span className="hb-f" style={{ width: `${(c.count / maxCity) * 100}%`, background: magColor(c.maxMag) }} />
                </span>
                <span className="hb-v">{fmtInt(c.count)}</span>
              </li>
            ))}
          </ul>
          <p className="muted tiny">Her deprem, merkez üssüne en yakın il merkezine sayılır.</p>
        </section>
      </div>

      <section className="card">
        <h3>Son 30 günün en büyükleri</h3>
        <ol className="qlist">
          {biggest.map((q) => (
            <li key={q.id}>
              <button className="qrow" onClick={() => onSelect(q.id)}>
                <span className="qmag" style={{ background: magColor(q.mag) }}>{fmtMag(q.mag)}</span>
                <span className="qmain">
                  <span className="qplace">{placeLabel(q, q.region).text}</span>
                  <span className="qmeta">{relativeTime(q.time)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
