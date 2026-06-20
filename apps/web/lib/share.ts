// LINE 分享（台灣專屬成長槓桿）：交接卡/里程碑本就為「分享給家人」設計，
// LINE 深連結＝家庭擴張的低成本病毒迴圈。純 URL 組裝，可單元測試。

const LINE_MAX_TEXT = 1000 // LINE 分享 URL 文字過長會被截斷/失敗，保守上限

/**
 * 組 LINE 文字分享連結：開啟 LINE 並帶入預填文字（手機/桌面皆可）。
 * 用 line.me/R/msg/text/ 的官方文字分享端點；文字過長先截斷避免失敗。
 */
export function lineShareUrl(text: string): string {
  const t = (text || '').slice(0, LINE_MAX_TEXT)
  return `https://line.me/R/msg/text/?${encodeURIComponent(t)}`
}
