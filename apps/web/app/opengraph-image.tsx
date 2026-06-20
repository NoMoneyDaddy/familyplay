import { ImageResponse } from 'next/og'

// 品牌分享圖（Open Graph / LINE / 社群連結預覽）。
// 刻意「不含任何孩子資料」——只放站名、標語與品牌色，符合本專案隱私原則；
// 用途是讓分享 App 連結時的預覽好看、利於口碑獲客。Next 會自動注入 og:image / twitter:image。
export const alt = 'FamilyPlay — 30 秒找到今天的陪伴方式'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
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
        fontFamily: 'sans-serif',
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
        30 秒找到今天的陪伴方式
      </div>
      <div style={{ fontSize: 30, color: '#6B615A', marginTop: 14 }}>給疲憊家長的親子陪伴導航</div>
    </div>,
    { ...size },
  )
}
