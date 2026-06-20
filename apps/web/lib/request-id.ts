// 取得本次請求的關聯 id（風險 A2）。middleware 會為每個請求設好 x-request-id 並轉發；
// 直接呼叫 route handler（如測試）或非預期缺header 時，退而新生一個，確保永遠有值可上報。
export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') || crypto.randomUUID()
}
