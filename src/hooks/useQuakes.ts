import { useEffect, useRef, useState } from 'react'
import { EMSC_WS, inBox, loadQuakes, mergeQuakes, parseEmscFeature } from '../lib/sources'
import { RANGE_HOURS, type Quake, type RangeKey } from '../lib/types'

const POLL_MS = 60_000

export interface QuakeFeed {
  quakes: Quake[]
  loading: boolean
  error: string | null
  updatedAt: number | null
  source: 'emsc' | 'usgs' | null
  live: boolean
}

/**
 * Loads the events for the range, then keeps them fresh: EMSC's websocket
 * pushes new events as they are located, and a one-minute poll covers the
 * gaps (and the USGS fallback, which has no push).
 */
export function useQuakes(range: RangeKey, minMag: number, onNew?: (q: Quake[]) => void): QuakeFeed {
  const [state, setState] = useState<QuakeFeed>({
    quakes: [],
    loading: true,
    error: null,
    updatedAt: null,
    source: null,
    live: false,
  })
  const onNewRef = useRef(onNew)
  useEffect(() => {
    onNewRef.current = onNew
  })

  useEffect(() => {
    let cancelled = false
    let ctrl = new AbortController()
    const startMs = () => Date.now() - RANGE_HOURS[range] * 3_600_000
    let known = new Set<string>()
    let first = true

    const apply = (incoming: Quake[], source?: 'emsc' | 'usgs') => {
      if (cancelled) return
      const fresh = first ? [] : incoming.filter((q) => !known.has(q.id))
      setState((s) => {
        const cutoff = startMs()
        const merged = mergeQuakes([s.quakes, incoming]).filter((q) => q.time >= cutoff && q.mag >= minMag)
        known = new Set(merged.map((q) => q.id))
        return { ...s, quakes: merged, loading: false, error: null, updatedAt: Date.now(), source: source ?? s.source }
      })
      first = false
      if (fresh.length && onNewRef.current) onNewRef.current(fresh)
    }

    const load = async () => {
      ctrl.abort()
      ctrl = new AbortController()
      try {
        const { quakes, source } = await loadQuakes({ startMs: startMs(), minMag, signal: ctrl.signal })
        apply(quakes, source)
      } catch (err) {
        if ((err as Error).name === 'AbortError' || cancelled) return
        setState((s) => ({ ...s, loading: false, error: 'Veri kaynağına ulaşılamadı. Bağlantını kontrol et, birazdan tekrar denenecek.' }))
      }
    }

    setState((s) => ({ ...s, quakes: [], loading: true, error: null }))
    load()
    const timer = setInterval(load, POLL_MS)

    // Real-time push from EMSC
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    const connect = () => {
      if (cancelled || typeof WebSocket === 'undefined') return
      try {
        ws = new WebSocket(EMSC_WS)
      } catch {
        return
      }
      ws.onopen = () => !cancelled && setState((s) => ({ ...s, live: true }))
      ws.onclose = () => {
        if (cancelled) return
        setState((s) => ({ ...s, live: false }))
        retry = setTimeout(connect, 15_000)
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          const q = parseEmscFeature(msg.data)
          if (q && inBox(q.lat, q.lon)) apply([q])
        } catch {
          /* ignore malformed message */
        }
      }
    }
    connect()

    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      ctrl.abort()
      clearInterval(timer)
      clearTimeout(retry)
      document.removeEventListener('visibilitychange', onVisible)
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
  }, [range, minMag])

  return state
}

/** A one-off load (used by the statistics page). */
export function useQuakeHistory(days: number, minMag: number, enabled: boolean) {
  const [data, setData] = useState<{ quakes: Quake[]; loading: boolean; error: string | null }>({
    quakes: [],
    loading: false,
    error: null,
  })
  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    setData((d) => ({ ...d, loading: true, error: null }))
    loadQuakes({ startMs: Date.now() - days * 86_400_000, minMag, signal: ctrl.signal })
      .then(({ quakes }) => setData({ quakes, loading: false, error: null }))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setData({ quakes: [], loading: false, error: 'Veriler yüklenemedi.' })
      })
    return () => ctrl.abort()
  }, [days, minMag, enabled])
  return data
}
