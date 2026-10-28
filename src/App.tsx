import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import QuakeMap from './components/QuakeMap'
import QuakeList from './components/QuakeList'
import QuakeDetail from './components/QuakeDetail'
import { shareUrl } from './lib/share'
import NearMe, { type SavedPlace } from './components/NearMe'
import AlertPanel from './components/AlertPanel'
import { useQuakes } from './hooks/useQuakes'
import { useStored } from './hooks/useStored'
import { fetchEvent } from './lib/sources'
import { placeLabel } from './lib/geo'
import { clock, fmtMag, fmtInt, relativeTime } from './lib/format'
import { alertBody, alertTitle, beep, DEFAULT_ALERTS, shouldAlert, systemNotify, type AlertSettings } from './lib/alerts'
import type { Quake, RangeKey } from './lib/types'
import { magColor } from './lib/intensity'

const Stats = lazy(() => import('./components/Stats'))
const Prepare = lazy(() => import('./components/Prepare'))

type Tab = 'canli' | 'yakin' | 'istatistik' | 'hazirlik'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'canli', label: 'Canlı', icon: '◉' },
  { id: 'yakin', label: 'Yakınım', icon: '⌖' },
  { id: 'istatistik', label: 'İstatistik', icon: '▥' },
  { id: 'hazirlik', label: 'Hazırlık', icon: '✚' },
]
const RANGES: { id: RangeKey; label: string }[] = [
  { id: '24h', label: '24 saat' },
  { id: '7d', label: '7 gün' },
  { id: '30d', label: '30 gün' },
]
const MAGS = [0, 2, 3, 4]

interface Route {
  tab: Tab
  quakeId: string | null
}

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '')
  const [a, b] = h.split('/')
  if (a === 'deprem' && b) return { tab: 'canli', quakeId: decodeURIComponent(b) }
  const tab = TABS.find((t) => t.id === a)?.id ?? 'canli'
  return { tab, quakeId: null }
}

interface Toast {
  q: Quake
  at: number
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash)
  const [range, setRange] = useStored<RangeKey>('sarsinti.range', '24h')
  const [minMag, setMinMag] = useStored<number>('sarsinti.minMag', 0)
  const [query, setQuery] = useState('')
  const [place, setPlace] = useStored<SavedPlace | null>('sarsinti.place', null)
  const [radiusKm, setRadiusKm] = useStored<number>('sarsinti.radius', 100)
  const [alerts, setAlerts] = useStored<AlertSettings>('sarsinti.alerts', DEFAULT_ALERTS)
  const [theme, setTheme] = useStored<'auto' | 'light' | 'dark'>('sarsinti.theme', 'auto')
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [extra, setExtra] = useState<Quake | null>(null)
  const [, tick] = useState(0)

  const dark = theme === 'dark' || (theme === 'auto' && systemDark)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSystemDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    // An opened event keeps the tab underneath it.
    const on = () =>
      setRoute((prev) => {
        const r = parseHash()
        return r.quakeId ? { tab: prev.tab, quakeId: r.quakeId } : r
      })
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // Refresh "x dk önce" labels.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const onNew = useCallback(
    (fresh: Quake[]) => {
      const hits = fresh.filter((q) => shouldAlert(q, alerts, place))
      if (!hits.length) return
      setToasts((t) => [...hits.map((q) => ({ q, at: Date.now() })), ...t].slice(0, 3))
      if (alerts.sound) beep()
      if (document.visibilityState !== 'visible') hits.forEach((q) => systemNotify(q, place, shareUrl(q)))
    },
    [alerts, place],
  )

  const feed = useQuakes(range, minMag, onNew)

  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => setToasts((ts) => ts.filter((x) => Date.now() - x.at < 12_000)), 12_500)
    return () => clearTimeout(t)
  }, [toasts])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    if (!q) return feed.quakes
    return feed.quakes.filter((x) => {
      const p = placeLabel(x, x.region)
      return p.text.toLocaleLowerCase('tr').includes(q) || x.region.toLocaleLowerCase('tr').includes(q)
    })
  }, [feed.quakes, query])

  const selected = useMemo(() => {
    if (!route.quakeId) return null
    return feed.quakes.find((q) => q.id === route.quakeId) ?? (extra?.id === route.quakeId ? extra : null)
  }, [route.quakeId, feed.quakes, extra])

  // Shared links can point to an event outside the loaded range.
  useEffect(() => {
    const id = route.quakeId
    if (!id || feed.loading || selected) return
    const ctrl = new AbortController()
    fetchEvent(id, ctrl.signal)
      .then((q) => q && setExtra(q))
      .catch(() => {})
    return () => ctrl.abort()
  }, [route.quakeId, feed.loading, selected])

  const go = (tab: Tab) => {
    location.hash = `/${tab}`
  }
  const select = useCallback((id: string) => {
    location.hash = `/deprem/${encodeURIComponent(id)}`
  }, [])
  const closeDetail = useCallback(() => {
    location.hash = `/${route.tab}`
  }, [route.tab])

  const big = feed.quakes.find((q) => q.mag >= 5 && Date.now() - q.time < 86_400_000)
  const biggest = feed.quakes.reduce<Quake | null>((b, q) => (!b || q.mag > b.mag ? q : b), null)
  const rangeLabel = RANGES.find((r) => r.id === range)!.label

  const filters = (
    <div className="filters">
      <div className="chips" role="group" aria-label="Zaman aralığı">
        {RANGES.map((r) => (
          <button key={r.id} className={'chip' + (r.id === range ? ' on' : '')} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="En küçük büyüklük">
        {MAGS.map((m) => (
          <button key={m} className={'chip' + (m === minMag ? ' on' : '')} onClick={() => setMinMag(m)}>
            {m === 0 ? 'Tümü' : `M${m}+`}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#/canli" aria-label="Sarsıntı ana sayfa">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="currentColor" className="brand-bg" />
            <path d="M4 17h5l2.5-7 4 13 3.5-10 2 4h7" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Sarsıntı</span>
        </a>
        <span className={'live' + (feed.live ? ' on' : '')} title={feed.live ? 'Canlı bağlantı açık' : 'Dakikada bir yenileniyor'}>
          <i />
          {feed.updatedAt ? `${feed.live ? 'Canlı' : 'Güncel'} · ${clock(feed.updatedAt)}` : 'Bağlanıyor…'}
        </span>
        <nav className="tabs" aria-label="Bölümler">
          {TABS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} className={'tab' + (route.tab === t.id ? ' on' : '')} aria-current={route.tab === t.id ? 'page' : undefined}>
              <span className="tab-i" aria-hidden="true">{t.icon}</span>
              {t.label}
            </a>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => setShowAlerts(true)} aria-label="Uyarı ayarları" title="Uyarı ayarları">
            🔔
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
            title="Tema"
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {big && (
        <button className="banner" onClick={() => select(big.id)}>
          <b>{fmtMag(big.mag)}</b> büyüklüğünde deprem · {placeLabel(big, big.region).text} · {relativeTime(big.time)} →
        </button>
      )}
      {feed.error && <div className="banner warn-banner">{feed.error}</div>}

      <main>
        {route.tab === 'canli' && (
          <div className="live-layout">
            <div className="map-wrap">
              <QuakeMap
                quakes={filtered}
                selectedId={route.quakeId}
                onSelect={select}
                user={place}
                dark={dark}
              />
              <div className="legend" aria-hidden="true">
                {[2, 3, 4, 5, 6].map((m) => (
                  <span key={m}>
                    <i style={{ background: magColor(m) }} />
                    {m}+
                  </span>
                ))}
              </div>
            </div>
            <section className="side">
              {filters}
              <input
                className="search"
                type="search"
                placeholder="İl ya da bölge ara (örn. Malatya)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="İl ya da bölge ara"
              />
              <div className="summary">
                {feed.loading ? (
                  'Depremler yükleniyor…'
                ) : (
                  <>
                    <b>{fmtInt(filtered.length)}</b> deprem · {rangeLabel}
                    {biggest && (
                      <>
                        {' '}· en büyüğü <b>{fmtMag(biggest.mag)}</b> ({placeLabel(biggest, biggest.region).city})
                      </>
                    )}
                  </>
                )}
              </div>
              {feed.loading ? (
                <div className="skeleton">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>
              ) : (
                <QuakeList quakes={filtered} selectedId={route.quakeId} onSelect={select} user={place} />
              )}
              <p className="muted tiny src">
                Veri: {feed.source === 'usgs' ? 'USGS (yedek kaynak, M2.5+)' : 'EMSC — Kandilli (KOERI) ve AFAD çözümleri dahil'}. Resmî açıklamalar için AFAD'ı takip et.
              </p>
            </section>
          </div>
        )}

        {route.tab === 'yakin' && (
          <>
            <div className="page-filters">{filters}</div>
            <NearMe
              quakes={feed.quakes}
              place={place}
              setPlace={setPlace}
              radiusKm={radiusKm}
              setRadiusKm={setRadiusKm}
              rangeLabel={rangeLabel}
              selectedId={route.quakeId}
              onSelect={select}
            />
          </>
        )}

        <Suspense fallback={<p className="empty">Yükleniyor…</p>}>
          {route.tab === 'istatistik' && <Stats onSelect={select} />}
          {route.tab === 'hazirlik' && <Prepare />}
        </Suspense>
      </main>

      {selected && <QuakeDetail quake={selected} all={feed.quakes} user={place} onClose={closeDetail} />}

      {showAlerts && (
        <AlertPanel settings={alerts} setSettings={setAlerts} hasPlace={!!place} onClose={() => setShowAlerts(false)} goNear={() => { setShowAlerts(false); go('yakin') }} />
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map(({ q }) => (
          <button key={q.id} className="toast-q" onClick={() => select(q.id)}>
            <span className="qmag" style={{ background: magColor(q.mag) }}>{fmtMag(q.mag)}</span>
            <span>
              <b>{alertTitle(q)}</b>
              <br />
              {alertBody(q, place)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
