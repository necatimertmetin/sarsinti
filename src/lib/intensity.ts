// Rough shaking estimate at a point, using the Atkinson & Wald (2007)
// intensity prediction equation. It is an estimate only: local soil,
// building type and the real fault geometry can change it a lot.

const C = { c1: 12.27, c2: 2.27, c3: 0.1304, c4: -1.3, c5: -0.000707, c6: 1.95, c7: -0.577, h: 14, rt: 30 }

/** Modified Mercalli intensity (1..10) at epicentral distance `km` for magnitude `mag`. */
export function estimateMMI(rawMag: number, km: number): number {
  // Below ~M1.2 the far-field terms make intensity grow with distance; such
  // events are not felt anyway, so evaluate them as M2.
  const mag = Math.max(2, rawMag)
  const R = Math.sqrt(km * km + C.h * C.h)
  const logR = Math.log10(R)
  const B = Math.max(0, Math.log10(R / C.rt))
  const m = mag - 6
  const mmi = C.c1 + C.c2 * m + C.c3 * m * m + C.c4 * logR + C.c5 * R + C.c6 * B + C.c7 * mag * logR
  return Math.min(10, Math.max(1, mmi))
}

export interface IntensityInfo {
  level: number
  roman: string
  label: string
  description: string
  color: string
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const LEVELS: Omit<IntensityInfo, 'level' | 'roman'>[] = [
  { label: 'Hissedilmez', description: 'Cihazlar kaydeder, insanlar fark etmez.', color: '#9aa5b1' },
  { label: 'Çok zayıf', description: 'Sadece üst katlarda, hareketsiz duran birkaç kişi fark edebilir.', color: '#a0c4e8' },
  { label: 'Zayıf', description: 'İçeridekilerin bir kısmı hisseder, asılı eşyalar sallanabilir.', color: '#7fd1c7' },
  { label: 'Hafif', description: 'İçeride çoğu kişi hisseder, camlar ve kapılar tıkırdar.', color: '#8ed081' },
  { label: 'Orta', description: 'Herkes hisseder, uyuyanlar uyanır, küçük eşyalar devrilebilir.', color: '#e6d34f' },
  { label: 'Güçlü', description: 'Korkutucu sarsıntı, eşyalar yer değiştirir, sıvada çatlaklar olabilir.', color: '#f2a93b' },
  { label: 'Çok güçlü', description: 'Ayakta durmak zorlaşır, zayıf yapılarda hasar beklenir.', color: '#ef7a33' },
  { label: 'Yıkıcı', description: 'Sağlam olmayan yapılarda ağır hasar, bazı yıkımlar.', color: '#e0442c' },
  { label: 'Çok yıkıcı', description: 'Yaygın ağır hasar ve yıkım.', color: '#c0172b' },
  { label: 'Aşırı', description: 'Yapıların çoğu yıkılır.', color: '#7d0d22' },
]

export function intensityInfo(mmi: number): IntensityInfo {
  const level = Math.min(10, Math.max(1, Math.round(mmi)))
  return { level, roman: ROMAN[level - 1], ...LEVELS[level - 1] }
}

/** Color for a magnitude marker. */
export function magColor(mag: number): string {
  if (mag >= 6) return '#b3122e'
  if (mag >= 5) return '#e0442c'
  if (mag >= 4) return '#f07c2e'
  if (mag >= 3) return '#e8b630'
  if (mag >= 2) return '#7fbf5a'
  return '#6aa8d8'
}

export function magLabel(mag: number): string {
  if (mag >= 7) return 'Büyük'
  if (mag >= 6) return 'Kuvvetli'
  if (mag >= 5) return 'Orta-kuvvetli'
  if (mag >= 4) return 'Orta'
  if (mag >= 3) return 'Hafif'
  return 'Küçük'
}
