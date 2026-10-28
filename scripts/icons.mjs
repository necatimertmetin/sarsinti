// Renders the PNG icons and the social preview image from SVG.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const icon = readFileSync('public/favicon.svg')
const maskable = readFileSync('public/icon-maskable.svg')
await sharp(icon, { density: 600 }).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(icon, { density: 1200 }).resize(512, 512).png().toFile('public/icon-512.png')
await sharp(maskable, { density: 1200 }).resize(512, 512).png().toFile('public/icon-maskable-512.png')

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0b0f14"/>
  <path d="M0 400 H300 l40-110 60 210 55-160 30 60 H1200" fill="none" stroke="#d6342c" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>
  <rect x="80" y="90" width="96" height="96" rx="24" fill="#d6342c"/>
  <path d="M92 141h15l7.5-21 12 39 10.5-30 6 12h21" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="200" y="160" font-family="Segoe UI, Arial, sans-serif" font-size="72" font-weight="800" fill="#fff">Sarsıntı</text>
  <text x="80" y="270" font-family="Segoe UI, Arial, sans-serif" font-size="44" fill="#e8ecf1">Türkiye'de son depremler, canlı.</text>
  <text x="80" y="560" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#95a0ae">Harita · Yakınımda · Tahmini şiddet · Uyarılar · Deprem çantası</text>
</svg>`
await sharp(Buffer.from(og)).png().toFile('public/og.png')
console.log('icons written')
