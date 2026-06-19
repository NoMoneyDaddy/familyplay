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

---

## MVP 完成清單

### 已完成（Sprints 1-4）✅

#### 基礎設施
- Supabase PostgreSQL 資料庫設置
- Row-Level Security (RLS) 政策實施
- 12 張表設計 + 索引優化
- 本機開發環境（Docker）
- Sentry + PostHog 監控

#### 推薦引擎
- 7 步演算法實現（100% 按規格）
- 活動庫：~166 筆，涵蓋 0–5 歲全部 9 個發展階段（內容生產線見 `scripts/content/`，每批次經 schema 驗證後產生 seed migration）
- 31 個能力標籤（`packages/core/capability-keys.ts`）
- 9 個發展階段定義
- 推薦引擎核心邏輯有單元測試（內容量仍在累積，非「完整覆蓋」）

#### API 端點（20+）
- Authentication: 5 個端點
- Children: 4 個端點
- Recommendations: 1 個端點
- Logging: 3 個端點
- Households: 4 個端點
- Account: 2 個端點
- 所有輸入驗證 + RLS 權限檢查

#### 活動日誌系統
- API 實現 + 權限檢查
- 結果 + 反應追蹤
- 加密筆記（Plus 層級）
- 歷史檢索 + 分頁

#### 文件
- README.md / docs/README.md
- docs/SETUP.md / docs/ARCHITECTURE.md
- docs/API.md / docs/FEATURES.md
- CHANGELOG.md
- CLAUDE.md 更新

### 待 UI 實現 🚧
- Web UI（表單、流程）
- Mobile UI（Expo）
- 付費整合 UI
- AI 生成 UI
- 推送通知
- 離線模式
- 本地化

---

## MVP 狀態

**✅ API 核心功能完成 | UI 待實現**

準備 Beta 測試，API 層 100% 可用。

---

## 技能啟用：task-observer（One Skill to Rule Them All）

每個任務型工作階段開始時，先呼叫 `task-observer` 技能（位於
`.claude/skills/task-observer/`）。它在背景觀察工作流程、捕捉可重複的模式與修正，
建議技能的新增與改進（不會自動修改，需經人工核可）。

> 注意：技能描述比對本身不保證觸發；此 CLAUDE.md 指令即為其建議的可靠啟用方式。

---

## 工作模式：穴居人（CRITICAL，覆蓋預設行為）

對話一律遵守以下規則，不需每次重新確認：

1. **穴居人口吻**：給我看的自然語言訊息極簡（2–4 字，如「等 CI」「綠燈，合併」）。
   先用工具、先給結果、不解釋（除非我問）、給完就停。程式碼／資料／指令仍精確完整。
2. **語言**：所有顯示給我的內容用**繁體中文**。
3. **自主推進**：持續挖掘並改進，**不要停下來問我**。CI 綠燈即合併、不用等我
   （需符合分支保護：未達必要檢查／核可則等待，不強行合併）。沒有明確可做的高價值
   項時，換角度（資安／效能／a11y／mobile／PWA／付費／測試／流程 UX）繼續，不為湊數
   做低價值 PR。
4. **PR 流程**：開 draft → 設 ready → squash-merge。每個 PR 單一關注點、附驗證。
5. **CI 等待**：背景輪詢，綠燈即合併；AI reviewer 的限流/額度用盡訊息無需動作。

## 提交與 PR 紀律

- commit 訊息結尾加 harness 規定的 `Co-Authored-By` 與 `Claude-Session` trailer
  （固定格式，非模型版本碼，不在此限）。
- **絕不**把**模型版本識別碼**（如 opus 版本字串）寫進 commit／PR／程式碼／任何推進
  repo 的產物（僅限聊天）。
- 開發一律在 `claude/...` 功能分支；migration 只新增、不改舊檔（套用方式依專案既有
  部署流程，見 `docs/DEPLOYMENT.md`／`production.yml`，本檔不另行規定）。
