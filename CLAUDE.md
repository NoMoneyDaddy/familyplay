# FamilyPlay — CLAUDE.md

給疲憊家長的親子陪伴導航 App。家長選當下狀態，30 秒拿到可立即執行的陪伴方案。
Web（PWA）+ iOS + Android 全平台。

→ 目前任務：看 `CURRENT_SPRINT.md`

---

## 指令

```bash
pnpm install          # 安裝依賴
pnpm biome check .    # Lint 檢查（CI 用）
pnpm turbo type-check # TypeScript 驗證
pnpm turbo test       # 跑測試
git push origin main  # 推送 → Zeabur 自動部署正式版
```

DB migration 只能手動：複製 `supabase/migrations/` 的 SQL 到 Supabase Dashboard → SQL Editor 執行。

---

## 專案結構

```
apps/web/              Next.js 15 + App Router，output: standalone（Zeabur Docker 部署）
apps/mobile/           Expo 52 + Expo Router（iOS + Android）
packages/core/         推薦引擎，純 TS，無外部依賴
packages/ai/           多 AI Provider
packages/assessment/   發展評估系統
packages/capabilities/ 能力標籤常數
packages/db/           Drizzle Schema 定義（型別用）+ Supabase 型別
supabase/migrations/   只能新增，不能修改舊檔
```

---

## 資料庫規則（CRITICAL）

**Drizzle 只用於 Schema 定義和型別推斷，絕對不執行查詢。**

```typescript
// ✅ 正確 — RLS 自動生效
import { createServerClient } from '@supabase/ssr'
const { data } = await supabase.from('child_profiles').select('*')

// ❌ 錯誤 — 繞過 RLS！
import { db } from '@familyplay/db'
const data = await db.select().from(childProfiles)
```

---

## stageKey 定義（白名單驗證必用）

```typescript
export const STAGE_KEYS = {
  NEWBORN:          'newborn',          // 0–3 個月
  EARLY_INFANT:     'early_infant',     // 3–6 個月
  SITTING_BABY:     'sitting_baby',     // 6–9 個月
  CRAWLER:          'crawler',          // 9–12 個月
  EARLY_WALKER:     'early_walker',     // 12–18 個月
  TODDLER_TALKER:   'toddler_talker',   // 18–24 個月
  TODDLER_PLAYER:   'toddler_player',   // 24–36 個月
  PRESCHOOLER:      'preschooler',      // 36–48 個月
  PRESCHOOLER_PLUS: 'preschooler_plus', // 48–60 個月
} as const
```

---

## 推薦引擎七步（順序不能改）

1. 年齡安全過濾 — 0–3 歲禁小零件
2. 情境安全規則 — 睡前排除高刺激，情緒排除競賽
3. 能力匹配過濾 — `requiredCapabilities ⊆` 孩子已達能力
4. ZPD 評分 — 發展中能力的活動加分
5. 情境過濾 — 家長狀態、場景、資源、時間
6. 優先排序 — 零花費 > 低收拾 > 短準備時間
7. 歷史降權 — 近 7 天出現過的活動降 30% 分數

---

## AI 安全（每條都不能跳過）

1. 白名單驗證所有 AI 輸入（stageKey、capabilityKeys、parentEnergy）
2. Safety Filter 在所有 AI 輸出後執行，失敗降回規則式推薦
3. AI Key 不寫 Log、不存資料庫、Request 結束立即釋放
4. 每用戶每分鐘限制 10 次 AI 請求（Upstash Redis）
5. 絕對不傳孩子暱稱或生日給 AI API

---

## 絕對不能做

- Client 端存 API Key（用 Secure Storage / sessionStorage）
- `NEXT_PUBLIC_` 前綴存敏感值
- AI 輸出跳過 Safety Filter
- 直接修改舊的 migration 檔（只能新增）
- 沒有 RLS 的資料表部署到正式環境
- `dangerouslySetInnerHTML`
- Log 輸出 `Authorization` Header
- 用真實孩子資料測試（用 seed 假資料）

---

## Commit 格式

```
feat: 新功能
fix: 修 bug
security: 資安修復
chore: 維護、設定
docs: 文件
test: 測試
perf: 性能優化
```

每次 commit 前，hooks 會自動跑 Biome + TypeCheck，失敗會擋住。
