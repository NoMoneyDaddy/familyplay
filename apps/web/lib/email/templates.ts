import type { EmailMessage } from './resend'

// Email 內容模板（純函式、可測）。每週「陪伴回顧」再觸達：給疲憊家長正向回饋、拉回流。
//
// 隱私：email 比 App 內更不可控（轉寄/截圖/外洩風險高），刻意**不帶孩子暱稱/生日**，
// 一律用「孩子」泛稱；只放聚合數字（本週次數、連續天數）與一個回 App 的連結。

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface WeeklyRecapData {
  to: string
  weeklySessions: number
  streak: number
  appUrl?: string
}

/**
 * 每週陪伴回顧 email。內容只用聚合數字 + 鼓勵語 + 回 App CTA，無任何孩子個資。
 * 文案隨數據給不同正向回饋（有陪 vs 久未陪都溫柔不施壓）。
 */
export function weeklyRecapEmail(data: WeeklyRecapData): EmailMessage {
  const { to, weeklySessions, streak } = data
  const appUrl = data.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://familyplay.nomoneydaddy.app'

  const headline =
    weeklySessions > 0 ? `這週你陪了 ${weeklySessions} 次 💛` : '這週還沒開始，沒關係 🌱'
  const streakLine =
    streak > 0 ? `目前連續陪伴 ${streak} 天，火苗還在 🔥` : '今天 30 秒，就能重新開始。'
  const body =
    weeklySessions > 0
      ? '每一次陪伴都算數。要不要再陪孩子玩一個？'
      : '疲憊是常態。打開 App，30 秒拿到一個現在就能做的陪伴方案。'

  const text = [
    headline,
    streakLine,
    '',
    body,
    '',
    `現在就陪：${appUrl}/now`,
    '',
    '— FamilyPlay',
  ].join('\n')

  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(headline)}</title></head><body style="margin:0;background:#FAF6F0;font-family:-apple-system,'Noto Sans TC',sans-serif;">
  <main style="max-width:480px;margin:0 auto;padding:32px 24px;">
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#241F1B;">${escapeHtml(headline)}</h1>
    <p style="margin:8px 0 0;font-size:15px;color:#6B615A;">${escapeHtml(streakLine)}</p>
    <p style="margin:20px 0 0;font-size:15px;color:#241F1B;line-height:1.6;">${escapeHtml(body)}</p>
    <a href="${escapeHtml(`${appUrl}/now`)}" style="display:inline-block;margin-top:24px;background:#FF6B35;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:14px;">現在就陪 →</a>
    <p style="margin-top:32px;font-size:12px;color:#A89E96;">FamilyPlay · 給疲憊家長的親子陪伴導航</p>
  </main></body></html>`

  return { to, subject: headline, html, text }
}
