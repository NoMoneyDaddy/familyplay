import type { RecommendedActivity } from '@familyplay/data'
import * as SecureStore from 'expo-secure-store'
import { type CachedRec, parseCachedRec, toCachedRec } from './rec-cache-pure'

// /now 離線回放：記住每個孩子上次成功拿到的主方案，斷網/網路不穩時還能顯示一個能玩的，
// 而非只給錯誤畫面。純解析/取子集邏輯在 rec-cache-pure（可測試）；本檔只負責 SecureStore 存取。
// 活動內容非敏感，存 SecureStore 只是手機端唯一可用的持久層。
export type { CachedRec } from './rec-cache-pure'

const key = (childId: string) => `familyplay.rec.${childId}`

export async function saveCachedRec(childId: string, rec: RecommendedActivity): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(childId), JSON.stringify(toCachedRec(rec)))
  } catch {
    // 寫入失敗僅是無法離線回放，不影響本次
  }
}

export async function readCachedRec(childId: string): Promise<CachedRec | null> {
  try {
    return parseCachedRec(await SecureStore.getItemAsync(key(childId)))
  } catch {
    return null
  }
}
