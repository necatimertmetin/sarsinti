const TZ = 'Europe/Istanbul'

export function relativeTime(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 45) return 'az önce'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} dk önce`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} sa önce`
  const d = Math.round(h / 24)
  return `${d} gün önce`
}

export function clock(ms: number): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ms)
}

export function dateTime(ms: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(ms)
}

export function shortDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d))
}

export function fmtMag(m: number): string {
  return m.toFixed(1).replace('.', ',')
}

export function fmtKm(km: number): string {
  return km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`
}

export function fmtInt(n: number): string {
  return new Intl.NumberFormat('tr-TR').format(n)
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
