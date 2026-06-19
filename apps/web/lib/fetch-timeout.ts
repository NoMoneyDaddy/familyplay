// fetch 包逾時：網路卡住（非立即失敗的 hang）時，預設毫秒後 abort，
// 讓既有的 .catch / try-catch 能收到 AbortError 並收尾，避免畫面永遠轉圈。
// 立即性的離線失敗本來就會 reject，這裡專治「連著但不回應」的慢網/掛起。
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 12000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: init.signal ?? controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// 是否為逾時/中止（給呼叫端區分「逾時」與「其他錯誤」用）
export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
