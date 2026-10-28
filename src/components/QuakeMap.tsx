import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLon, Quake } from '../lib/types'
import { magColor } from '../lib/intensity'
import { escapeHtml, fmtMag, relativeTime } from '../lib/format'
import { placeLabel } from '../lib/geo'

interface Props {
  quakes: Quake[]
  selectedId: string | null
  onSelect: (id: string) => void
  user?: LatLon | null
  radiusKm?: number
  dark: boolean
}

// Standard OSM tiles; the dark look is a CSS filter on the tile pane.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'

const radius = (mag: number) => Math.max(3, 2.2 * Math.pow(1.55, mag))

export default function QuakeMap({ quakes, selectedId, onSelect, user, radiusKm, dark }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const userLayer = useRef<L.LayerGroup | null>(null)
  const markers = useRef(new Map<string, L.CircleMarker>())
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true, preferCanvas: false, worldCopyJump: true }).setView([39.0, 35.2], 6)
    map.current = m
    layer.current = L.layerGroup().addTo(m)
    userLayer.current = L.layerGroup().addTo(m)
    tiles.current = L.tileLayer(TILES, { attribution: ATTR, maxZoom: 18 }).addTo(m)
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
  }, [])


  // Markers: smallest first so big events sit on top.
  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    markers.current.clear()
    const now = Date.now()
    const sorted = [...quakes].sort((a, b) => a.mag - b.mag)
    for (const q of sorted) {
      const ageH = (now - q.time) / 3_600_000
      const c = L.circleMarker([q.lat, q.lon], {
        radius: radius(q.mag),
        color: dark ? '#0b0f14' : '#ffffff',
        weight: 1,
        fillColor: magColor(q.mag),
        fillOpacity: ageH < 24 ? 0.85 : 0.5,
        className: ageH < 1 ? 'q-pulse' : '',
      })
      c.bindTooltip(`<b>${fmtMag(q.mag)}</b> · ${escapeHtml(placeLabel(q, q.region).text)}<br/>${relativeTime(q.time)}`, {
        direction: 'top',
        offset: [0, -4],
      })
      c.on('click', () => onSelectRef.current(q.id))
      c.addTo(g)
      markers.current.set(q.id, c)
    }
  }, [quakes, dark])

  useEffect(() => {
    const m = map.current
    if (!m || !selectedId) return
    const c = markers.current.get(selectedId)
    if (!c) return
    c.setStyle({ weight: 3, color: dark ? '#ffffff' : '#111827' })
    c.bringToFront()
    const ll = c.getLatLng()
    if (!m.getBounds().pad(-0.2).contains(ll)) m.flyTo(ll, Math.max(m.getZoom(), 8), { duration: 0.6 })
    return () => {
      c.setStyle({ weight: 1, color: dark ? '#0b0f14' : '#ffffff' })
    }
  }, [selectedId, quakes, dark])

  useEffect(() => {
    const g = userLayer.current
    if (!g) return
    g.clearLayers()
    if (!user) return
    L.circleMarker([user.lat, user.lon], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 1,
    })
      .bindTooltip('Konumun')
      .addTo(g)
    if (radiusKm)
      L.circle([user.lat, user.lon], {
        radius: radiusKm * 1000,
        color: '#2563eb',
        weight: 1,
        dashArray: '4 4',
        fillOpacity: 0.04,
      }).addTo(g)
  }, [user, radiusKm])

  return <div ref={el} className="map" role="region" aria-label="Deprem haritası" />
}
