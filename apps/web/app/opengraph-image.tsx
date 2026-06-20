import { ImageResponse } from 'next/og'

// 品牌分享圖（Open Graph / LINE / 社群連結預覽）。
// 刻意「不含任何孩子資料」——只放站名、標語與品牌色，符合本專案隱私原則；
// 用途是讓分享 App 連結時的預覽好看、利於口碑獲客。Next 會自動注入 og:image / twitter:image。
export const alt = 'FamilyPlay — 30 秒找到今天的陪伴方式'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TAGLINE = '30 秒找到今天的陪伴方式'
const SUBTITLE = '給疲憊家長的親子陪伴導航'

// next/og（Satori）預設不含中文字型 → 正式 serverless 環境中文會渲染成豆腐方塊。
// 用 Google Fonts 的 text= 子集 API 只抓「實際用到的字」，回傳極小的 ttf/otf，
// 再交給 ImageResponse 的 fonts。layout.tsx 已用 next/font/google 抓 Noto Sans TC，
// 證明建置環境本就能連 Google Fonts，來源一致。
async function loadNotoSansTC(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@700&text=${encodeURIComponent(text)}`
    const css = await fetch(url).then((res) => res.text())
    // 不帶現代瀏覽器 UA → Google 回 truetype/opentype（Satori 不支援 woff2）
    const resource = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)
    if (!resource?.[1]) return null
    const font = await fetch(resource[1])
    if (!font.ok) return null
    return await font.arrayBuffer()
  } catch {
    // 字型載入失敗時退化為無中文字型（拉丁字 FamilyPlay 仍正常），不讓建置整個崩掉
    return null
  }
}

export default async function OpengraphImage() {
  const fontData = await loadNotoSansTC(`${TAGLINE}${SUBTITLE}`)
  const fontFamily = fontData ? 'Noto Sans TC, sans-serif' : 'sans-serif'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF6F0',
        fontFamily,
      }}
    >
      {/* 暖色圓形品牌記號（取代 emoji，避免 AI slop 感） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 132,
          height: 132,
          borderRadius: 44,
          backgroundColor: '#FF6B35',
          color: '#FFFFFF',
          fontSize: 78,
          fontWeight: 700,
          marginBottom: 36,
        }}
      >
        F
      </div>
      <div style={{ fontSize: 76, fontWeight: 700, color: '#241F1B', letterSpacing: -1 }}>
        FamilyPlay
      </div>
      <div style={{ fontSize: 40, fontWeight: 600, color: '#FF6B35', marginTop: 16 }}>
        {TAGLINE}
      </div>
      <div style={{ fontSize: 30, color: '#6B615A', marginTop: 14 }}>{SUBTITLE}</div>
    </div>,
    {
      ...size,
      fonts: fontData
        ? [{ name: 'Noto Sans TC', data: fontData, style: 'normal', weight: 700 }]
        : undefined,
    },
  )
}
