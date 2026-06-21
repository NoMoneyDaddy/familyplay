// 「目前要陪哪個孩子」的單一解析規則，給 /now 與 /children 共用，避免兩處各寫一份而漂移。
// 規則：選定 id 存在於清單就用它；否則退回第一個（清單已依建立時間新到舊，第一個＝最新建立）。
// 純函式、無副作用，方便單元測試；持久化的自我修正（把失效 id 寫回第一個）由呼叫端處理。
export function resolveActiveChild<T extends { id: string }>(
  children: readonly T[],
  activeChildId: string | null | undefined,
): T | null {
  if (children.length === 0) return null
  return children.find((c) => c.id === activeChildId) ?? children[0]
}
