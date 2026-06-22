// 推薦結果的共用型別與純 helper。
// now / try / recommendations 三頁原本各自手刻同一套（型別還重名 Rec vs Recommendation、
// isRealActivity/UUID_RE/離線快取各一份）——集中於此消除漂移（白皮書 God File / PM#4）。

export interface Recommendation {
  id: string
  title: string
  reasons: string[]
  minDurationMinutes?: number
  maxDurationMinutes?: number
  stimulationLevel?: 'low' | 'medium' | 'high'
  developmentalFocus?: string[]
  // recommendations 頁會用到引擎分數；now/try 不需要，故設選填。
  score?: number
  // 一句白話開場白（怎麼開始玩）；主答案卡顯示用，安全回退方案為 null。
  openingLine?: string | null
}

/** 依時段自動帶情境：19:00–05:00 視為睡前（bedtime），其餘 normal。 */
export function timeDefaultContext(): 'bedtime' | 'normal' {
  const hour = new Date().getHours()
  return hour >= 19 || hour < 5 ? 'bedtime' : 'normal'
}

// 真實活動才有詳情頁（DB UUID）；引擎合成的安全回退方案 id 非 UUID，無對應頁面。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isRealActivity(id: string): boolean {
  return UUID_RE.test(id)
}

// 離線快取：記住每個孩子上次成功拿到的主方案，斷網/掛起時還能顯示一個能玩的，
// 而非只給錯誤畫面。localStorage 在隱私模式可能 throw，全包 try-catch。
const cacheKey = (childId: string) => `fp_now_rec_${childId}`

export function saveCachedRec(childId: string, rec: Recommendation): void {
  try {
    localStorage.setItem(cacheKey(childId), JSON.stringify(rec))
  } catch {
    // 寫入失敗僅是無法離線回放，不影響本次
  }
}

export function readCachedRec(childId: string): Recommendation | null {
  try {
    const raw = localStorage.getItem(cacheKey(childId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Recommendation>
    // 最小驗證：舊版快取結構漂移時別回殘缺物件（否則渲染 reasons.map 會 throw 白屏）。
    if (!parsed || typeof parsed.id !== 'string' || !Array.isArray(parsed.reasons)) return null
    return parsed as Recommendation
  } catch {
    return null
  }
}
