import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const BRAND = '#FF6B35'
const BG = '#FAFAF8'

// App icon 1024x1024: brand rounded square with white 陪 glyph
function iconSVG(size, bg, fg, glyphFill) {
  const r = Math.round(size * 0.18)
  const fontSize = Math.round(size * 0.5)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
    <text x="50%" y="50%" dy=".35em" text-anchor="middle"
      font-family="sans-serif" font-weight="700" font-size="${fontSize}" fill="${glyphFill}">陪</text>
  </svg>`)
}

const out = '/home/user/familyplay/apps/mobile/assets'
async function png(svg, w, h, file, bg) {
  let img = sharp(svg)
  if (bg) img = img.flatten({ background: bg })
  const buf = await img.resize(w, h, { fit: 'contain', background: bg || BG }).png().toBuffer()
  writeFileSync(`${out}/${file}`, buf)
  console.log('wrote', file, `${w}x${h}`)
}

// icon: brand bg, white glyph
await png(iconSVG(1024, BRAND, '#fff', '#ffffff'), 1024, 1024, 'icon.png')
// adaptive-icon foreground: transparent-ish bg handled by app.json backgroundColor; brand glyph on transparent
await png(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BG}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="512" fill="${BRAND}">陪</text></svg>`), 1024, 1024, 'adaptive-icon.png')
// splash: bg with centered brand glyph
await png(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1284" height="2778"><rect width="1284" height="2778" fill="${BG}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="320" fill="${BRAND}">陪</text></svg>`), 1284, 2778, 'splash.png', BG)
// favicon
await png(iconSVG(48, BRAND, '#fff', '#ffffff'), 48, 48, 'favicon.png')
