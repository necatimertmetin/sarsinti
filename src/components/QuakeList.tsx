import { memo } from 'react'
import type { LatLon, Quake } from '../lib/types'
import { distanceKm, placeLabel } from '../lib/geo'
import { clock, fmtKm, fmtMag, relativeTime } from '../lib/format'
import { magColor } from '../lib/intensity'

interface Props {
  quakes: Quake[]
  selectedId: string | null
  onSelect: (id: string) => void
  user?: LatLon | null
  limit?: number
  empty?: string
}

function QuakeList({ quakes, selectedId, onSelect, user, limit = 300, empty = 'Bu filtrelerle deprem yok.' }: Props) {
  if (!quakes.length) return <p className="empty">{empty}</p>
  const shown = quakes.slice(0, limit)
  return (
    <ol className="qlist">
      {shown.map((q) => {
        const place = placeLabel(q, q.region)
        return (
          <li key={q.id}>
            <button
              className={'qrow' + (q.id === selectedId ? ' sel' : '') + (q.mag >= 4 ? ' strong' : '')}
              onClick={() => onSelect(q.id)}
            >
              <span className="qmag" style={{ background: magColor(q.mag) }}>
                {fmtMag(q.mag)}
              </span>
              <span className="qmain">
                <span className="qplace">{place.text}</span>
                <span className="qmeta">
                  {clock(q.time)} · {relativeTime(q.time)} · {fmtKm(q.depth)} derinlik
                  {user ? ` · sana ${fmtKm(distanceKm(user, q))}` : ''}
                </span>
              </span>
            </button>
          </li>
        )
      })}
      {quakes.length > limit && (
        <li className="more">+{quakes.length - limit} deprem daha (filtreyi daraltarak görebilirsin)</li>
      )}
    </ol>
  )
}

export default memo(QuakeList)
