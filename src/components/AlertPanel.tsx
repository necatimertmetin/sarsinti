import { useState } from 'react'
import type { AlertSettings } from '../lib/alerts'
import { beep } from '../lib/alerts'

interface Props {
  settings: AlertSettings
  setSettings: (s: AlertSettings) => void
  hasPlace: boolean
  onClose: () => void
  goNear: () => void
}

export default function AlertPanel({ settings: s, setSettings, hasPlace, onClose, goNear }: Props) {
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const set = (patch: Partial<AlertSettings>) => setSettings({ ...s, ...patch })

  const ask = async () => {
    if (typeof Notification === 'undefined') return
    setPerm(await Notification.requestPermission())
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside className="sheet" role="dialog" aria-modal="true" aria-label="Uyarı ayarları" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Kapat">
          ×
        </button>
        <h2>Uyarılar</h2>
        <p className="muted small">
          Sarsıntı açıkken yeni bir deprem kaydedildiğinde ekranın altında uyarı gösterir. Sekme arka plandaysa sistem bildirimi
          gönderebilir. Bu bir erken uyarı sistemi değildir: depremler, gerçekleştikten birkaç dakika sonra kaydedilir.
        </p>
        <label className="check">
          <input type="checkbox" checked={s.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          Yeni depremlerde uyar
        </label>
        <label className="field">
          En küçük büyüklük
          <select value={s.minMag} onChange={(e) => set({ minMag: Number(e.target.value) })}>
            {[2, 3, 3.5, 4, 4.5, 5].map((m) => (
              <option key={m} value={m}>
                M{String(m).replace('.', ',')}+
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.nearOnly} onChange={(e) => set({ nearOnly: e.target.checked })} />
          Sadece yakınımdakiler
        </label>
        {s.nearOnly && (
          <label className="field">
            Yarıçap
            <select value={s.radiusKm} onChange={(e) => set({ radiusKm: Number(e.target.value) })}>
              {[50, 100, 200, 400].map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </label>
        )}
        {s.nearOnly && !hasPlace && (
          <p className="warn">
            Önce konumunu ayarla.{' '}
            <button className="link" onClick={goNear}>
              Yakınım sayfasına git
            </button>
          </p>
        )}
        <label className="check">
          <input type="checkbox" checked={s.sound} onChange={(e) => set({ sound: e.target.checked })} />
          Sesli uyarı
          <button className="link" onClick={(e) => { e.preventDefault(); beep() }}>
            dinle
          </button>
        </label>
        <div className="actions">
          {perm === 'default' && (
            <button className="btn primary" onClick={ask}>
              Sistem bildirimlerine izin ver
            </button>
          )}
          {perm === 'granted' && <span className="muted small">Sistem bildirimleri açık.</span>}
          {perm === 'denied' && <span className="muted small">Bildirim izni tarayıcı ayarlarından kapatılmış.</span>}
        </div>
      </aside>
    </div>
  )
}
