export interface Group {
  title: string
  items: string[]
}

// Based on AFAD's public "afet ve acil durum çantası" recommendations.
export const KIT: Group[] = [
  {
    title: 'Su ve yiyecek',
    items: [
      'Kişi başı en az 3 günlük içme suyu',
      'Bozulmayan yiyecekler (konserve, kuruyemiş, bisküvi)',
      'Konserve açacağı / çakı',
    ],
  },
  {
    title: 'Sağlık',
    items: ['İlk yardım çantası', 'Düzenli kullanılan ilaçlar (en az 1 haftalık)', 'Islak mendil, el dezenfektanı', 'Maske'],
  },
  {
    title: 'Araç gereç',
    items: ['El feneri ve yedek pil', 'Düdük', 'Pilli ya da kurmalı radyo', 'Powerbank ve şarj kablosu', 'Çok amaçlı bıçak, bant, ip'],
  },
  {
    title: 'Giyim ve barınma',
    items: ['Mevsime uygun yedek kıyafet', 'Battaniye ya da uyku tulumu', 'Yağmurluk', 'Sağlam ayakkabı', 'İş eldiveni'],
  },
  {
    title: 'Belgeler ve para',
    items: [
      'Kimlik, tapu, sigorta poliçesi fotokopileri (su geçirmez poşette)',
      'Bir miktar nakit para',
      'Yedek anahtarlar',
      'Önemli telefon numaralarının kâğıda yazılmış listesi',
    ],
  },
]

export const GUIDE: Group[] = [
  {
    title: 'Deprem öncesi',
    items: [
      'Dolap, kitaplık ve beyaz eşyaları duvara sabitle.',
      'Evdeki güvenli noktaları (sağlam masa altı, iç duvar dibi) önceden belirle.',
      'Binanın deprem dayanıklılığını bir uzmana kontrol ettir; DASK sigortanı yaptır.',
      'En yakın toplanma alanını e-Devlet\'ten öğren.',
    ],
  },
  {
    title: 'Deprem anında',
    items: [
      'ÇÖK – KAPAN – TUTUN: yere çök, başını ve enseni koru, sağlam bir şeye tutun.',
      'Sarsıntı bitene kadar yerinden ayrılma, merdiven ve asansör kullanma.',
      'Dışarıdaysan bina, direk ve ağaçlardan uzak, açık bir alana geç.',
      'Araçtaysan güvenli yerde dur, köprü ve tünel altında bekleme.',
    ],
  },
  {
    title: 'Deprem sonrası',
    items: [
      'Gaz, elektrik ve suyu kapat; kibrit ya da çakmak yakma.',
      'Hasarlı binalara girme, artçı depremlere hazır ol.',
      'Telefonu sadece acil durumda kullan; sevdiklerine kısa mesaj at.',
      'Resmi açıklamaları (AFAD, valilik) takip et, doğrulanmamış haberleri yayma.',
    ],
  },
]

export interface Contact {
  name: string
  phone: string
}

export interface Plan {
  meetingPoint: string
  assemblyArea: string
  outOfTownContact: string
  notes: string
  contacts: Contact[]
}

export const EMPTY_PLAN: Plan = { meetingPoint: '', assemblyArea: '', outOfTownContact: '', notes: '', contacts: [] }

export function planText(p: Plan): string {
  const lines = ['Aile deprem planımız (Sarsıntı)']
  if (p.meetingPoint) lines.push(`Buluşma noktası: ${p.meetingPoint}`)
  if (p.assemblyArea) lines.push(`Toplanma alanı: ${p.assemblyArea}`)
  if (p.outOfTownContact) lines.push(`Şehir dışı irtibat kişisi: ${p.outOfTownContact}`)
  for (const c of p.contacts) if (c.name || c.phone) lines.push(`• ${c.name} ${c.phone}`.trim())
  if (p.notes) lines.push(`Not: ${p.notes}`)
  lines.push('Acil durum: 112')
  return lines.join('\n')
}
