// /ads.txt — AdSense 發布商授權檔（Authorized Digital Sellers）。
// Google 抓此檔確認本站確實授權該 publisher 投放，避免「未授權賣方」警告與收益折損。
// 由 NEXT_PUBLIC_ADSENSE_CLIENT（ca-pub-XXXX）推出 pub id；未設定則回 404（休眠）。
const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

export const dynamic = 'force-static'

export function GET() {
  if (!client) {
    return new Response('# AdSense 尚未設定（NEXT_PUBLIC_ADSENSE_CLIENT）\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  // ca-pub-XXXX → pub-XXXX；f08c47fec0942fa0 為 Google AdSense 固定的認證機構 ID。
  const pub = client.replace(/^ca-/, '')
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}
