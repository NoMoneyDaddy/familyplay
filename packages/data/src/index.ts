// 跨平台資料存取層：純編排函式，簽名皆為 (supabase, args)。Web（server，cookie）與
// 行動端（native，SecureStore session）各自建立 Supabase client 後共用，消除兩端重複。
// RLS 由各自的 client 帶 session 自動生效；此層不持有任何金鑰。
export * from './activity'
export * from './capabilities'
export * from './children'
export * from './handoff'
export * from './history'
export * from './insights'
export * from './log'
export * from './recommend'
export * from './saved'
export * from './streak'
