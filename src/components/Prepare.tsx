import { useState } from 'react'
import { useStored } from '../hooks/useStored'
import { EMPTY_PLAN, GUIDE, KIT, planText, type Contact, type Plan } from '../lib/prepare'

async function shareOrCopy(text: string, done: () => void) {
  if ('share' in navigator) {
    try {
      await navigator.share({ text })
      return
    } catch {
      /* cancelled */
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    done()
  } catch {
    /* blocked */
  }
}

export default function Prepare() {
  const [checked, setChecked] = useStored<Record<string, boolean>>('sarsinti.kit', {})
  const [plan, setPlan] = useStored<Plan>('sarsinti.plan', EMPTY_PLAN)
  const [flash, setFlash] = useState<string | null>(null)
  const [withLocation, setWithLocation] = useState(false)

  const total = KIT.reduce((s, g) => s + g.items.length, 0)
  const done = KIT.reduce((s, g) => s + g.items.filter((i) => checked[i]).length, 0)
  const pct = Math.round((done / total) * 100)

  const notify = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2200)
  }

  const sendSafe = () => {
    const base = 'Ben iyiyim, güvendeyim. 🙏'
    const go = (extra = '') => {
      const text = base + extra
      if ('share' in navigator) shareOrCopy(text, () => notify('Mesaj kopyalandı'))
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
    if (withLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => go(`\nKonumum: https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`),
        () => go(),
        { timeout: 8000 },
      )
    } else go()
  }

  const setField = (k: keyof Plan, v: string) => setPlan((p) => ({ ...p, [k]: v }))
  const setContact = (i: number, k: keyof Contact, v: string) =>
    setPlan((p) => ({ ...p, contacts: p.contacts.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }))

  return (
    <div className="page">
      <section className="card safe">
        <h2>Güvendeyim mesajı</h2>
        <p className="muted">
          Deprem sonrası hatlar kilitlenir; kısa bir mesaj aramaktan çok daha kolay ulaşır. Tek dokunuşla sevdiklerine haber ver.
        </p>
        <label className="check">
          <input type="checkbox" checked={withLocation} onChange={(e) => setWithLocation(e.target.checked)} />
          Konumumu da ekle
        </label>
        <button className="btn safe-btn" onClick={sendSafe}>
          İyiyim, güvendeyim de
        </button>
        <p className="muted small">
          Acil durumda <a href="tel:112"><b>112</b></a>'yi ara. Enkaz altındaysan bağırmak yerine düdük çal ya da borulara vur.
        </p>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Deprem çantası</h2>
          <span className="pct">{pct}%</span>
        </div>
        <div className="progress" aria-label={`Hazırlık ${pct}%`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small">
          {done} / {total} malzeme hazır. İşaretlerin bu cihazda saklanır.
        </p>
        {KIT.map((g) => (
          <details key={g.title} className="kit" open={g.items.some((i) => !checked[i])}>
            <summary>
              {g.title}{' '}
              <span className="muted">
                {g.items.filter((i) => checked[i]).length}/{g.items.length}
              </span>
            </summary>
            <ul>
              {g.items.map((item) => (
                <li key={item}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!!checked[item]}
                      onChange={(e) => setChecked((c) => ({ ...c, [item]: e.target.checked }))}
                    />
                    {item}
                  </label>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      <section className="card">
        <h2>Aile planı</h2>
        <p className="muted small">Herkesin bilmesi gereken bilgileri bir kez yaz, aile grubuna gönder.</p>
        <div className="form">
          <label>
            Buluşma noktası (evin yakınında açık bir yer)
            <input value={plan.meetingPoint} onChange={(e) => setField('meetingPoint', e.target.value)} placeholder="Örn. okulun bahçesi" />
          </label>
          <label>
            Toplanma alanı (e-Devlet / AFAD'dan öğren)
            <input value={plan.assemblyArea} onChange={(e) => setField('assemblyArea', e.target.value)} placeholder="Örn. Atatürk Parkı" />
          </label>
          <label>
            Şehir dışındaki irtibat kişisi
            <input value={plan.outOfTownContact} onChange={(e) => setField('outOfTownContact', e.target.value)} placeholder="Örn. Ayşe teyze, Ankara" />
          </label>
          <fieldset>
            <legend>Kişiler</legend>
            {plan.contacts.map((c, i) => (
              <div className="row" key={i}>
                <input aria-label="Ad" value={c.name} placeholder="Ad" onChange={(e) => setContact(i, 'name', e.target.value)} />
                <input aria-label="Telefon" value={c.phone} placeholder="Telefon" inputMode="tel" onChange={(e) => setContact(i, 'phone', e.target.value)} />
                <button
                  className="btn ghost"
                  aria-label="Kişiyi sil"
                  onClick={() => setPlan((p) => ({ ...p, contacts: p.contacts.filter((_, j) => j !== i) }))}
                >
                  ×
                </button>
              </div>
            ))}
            <button className="btn ghost" onClick={() => setPlan((p) => ({ ...p, contacts: [...p.contacts, { name: '', phone: '' }] }))}>
              + Kişi ekle
            </button>
          </fieldset>
          <label>
            Notlar (ilaçlar, evcil hayvan, kim kimi alacak…)
            <textarea rows={3} value={plan.notes} onChange={(e) => setField('notes', e.target.value)} />
          </label>
        </div>
        <button className="btn primary" onClick={() => shareOrCopy(planText(plan), () => notify('Plan kopyalandı'))}>
          Planı paylaş
        </button>
      </section>

      <section className="card">
        <h2>Ne yapmalı?</h2>
        <div className="guide">
          {GUIDE.map((g) => (
            <div key={g.title}>
              <h3>{g.title}</h3>
              <ul>
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      {flash && <div className="toast">{flash}</div>}
    </div>
  )
}
