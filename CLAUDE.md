# FamilyPlay — CLAUDE.md

## 這個專案是什麼

給疲憊家長使用的親子陪伴導航 App。
家長選當下狀態，30 秒內拿到可立即開始的陪伴方案。
目標平台：Web（PWA）、Android、iOS（全平台）。

---

## 快速啟動

```bash
make init    # 第一次設定（Docker 必須已啟動）
make dev     # 啟動開發
make ship    # 推送正式版
```

---

## 專案結構

```
apps/web/              Next.js 15 + App Router（主要 UI）
apps/mobile/           Expo 52 + Expo Router（iOS + Android）
packages/core/         推薦引擎（最重要，純 TS，無外部依賴）
packages/ai/           多 AI Provider 支援
packages/assessment/   發展評估系統
packages/capabilities/ 能力標籤常數
packages/db/           Drizzle Schema 定義 + Supabase 型別
supabase/migrations/   資料庫結構（不要直接改舊檔）
```

---

## 現在做什麼

→ 看 `CURRENT_SPRINT.md`

---

## 技術棧決策（已定案，不要討論替換）

| 工具 | 用途 | 備註 |
|---|---|---|
| Next.js 15 | Web 框架（App Router）| Zeabur 部署，output: standalone |
| Expo 52 | iOS + Android | EAS Build 雲端編譯，不需要 Mac |
| Supabase | 資料庫 + Google 登入 + RLS | |
| TypeScript | 全端語言 | strict mode |
| Tailwind CSS v4 | Web 樣式 | |
| NativeWind | Mobile 樣式 | 與 Tailwind 共用設計系統 |
| Drizzle ORM | Schema 定義 + Migration | 不管理 RLS Policy |
| **Zustand** | 前端狀態管理 | 輕量，TypeScript 友好 |
| **TanStack Query** | 伺服器狀態 + 快取 | |
| **Zod** | 運行時型別驗證 | API 邊界必用 |
| **shadcn/ui** | Web UI 元件（Radix + Tailwind）| 快速開發，無障礙存取 |
| **Biome** | Lint + Format（取代 ESLint + Prettier）| 單一工具，快速 |
| **LemonSqueezy** | Web 訂閱付費 | 個人帳號可用，代理稅務 |
| RevenueCat | iOS + Android 內購 | Apple IAP + Google Play 統一 |
| **Zeabur** | Web 部署 | push GitHub 自動部署，台北節點低延遲 |
| EAS Build | Mobile 雲端編譯 | 不需要本機 Xcode/Android Studio |
| Expo Updates | OTA 熱更新 | 修 bug 不用等 App Store 審核 |
| GitHub Actions | CI/CD | |
| Sentry | 錯誤監控 | |
| PostHog | 匿名使用分析 | |
| Upstash Redis | AI 請求速率限制 + 回應快取 | |

---

## 資料庫使用規則（重要）

**Drizzle ORM 只用於：**
- Schema 定義（`packages/db/src/schema.ts`）
- 產生 migration 檔
- 型別推斷

**所有執行時的資料庫查詢用 Supabase JS Client：**

```typescript
// ✅ 正確：Server Component / API Route
import { createServerClient } from '@supabase/ssr'
const supabase = createServerClient(...)
const { data } = await supabase.from('child_profiles').select('*')
// RLS 自動生效 ✓

// ✅ 正確：Client Component
import { createBrowserClient } from '@supabase/ssr'

// ❌ 錯誤：用 Drizzle 執行查詢（RLS 不會生效）
import { db } from '@familyplay/db'
const data = await db.select().from(childProfiles)  // 繞過 RLS！
```

---

## stageKey 完整定義

推薦引擎、AI Prompt、白名單驗證都使用這些值：

```typescript
export const STAGE_KEYS = {
  NEWBORN:             'newborn',          // 0–3 個月
  EARLY_INFANT:        'early_infant',     // 3–6 個月
  SITTING_BABY:        'sitting_baby',     // 6–9 個月
  CRAWLER:             'crawler',          // 9–12 個月
  EARLY_WALKER:        'early_walker',     // 12–18 個月
  TODDLER_TALKER:      'toddler_talker',   // 18–24 個月
  TODDLER_PLAYER:      'toddler_player',   // 24–36 個月
  PRESCHOOLER:         'preschooler',      // 36–48 個月
  PRESCHOOLER_PLUS:    'preschooler_plus', // 48–60 個月
} as const
```

---

## 加密設計（Plus 功能）

**正確的 per-user salt 方式：**

```typescript
// 1. 用戶建立帳號時，產生隨機 salt 存入 user_profiles.encryption_salt
const salt = crypto.getRandomValues(new Uint8Array(32))

// 2. Key 推導：Google OAuth sub + 隨機 salt + PBKDF2
// FamilyPlay 伺服器知道 salt，但不知道 Google sub，所以無法推導 key
const key = await crypto.subtle.importKey('raw',
  new TextEncoder().encode(googleSub),
  { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
)
const derivedKey = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
  key, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
)

// ⚠️  在 UI 告知用戶：失去 Google 帳號 = 資料無法恢復
```

---

## 推薦引擎七步（不能改變順序）

```
1. 年齡安全過濾      排除危險活動，0–3 歲禁止小零件
2. 情境安全規則      睡前排除高刺激，情緒排除競賽
3. 能力匹配過濾      requiredCapabilities ⊆ 孩子已達能力
4. ZPD 評分         發展中能力的活動加分
5. 情境過濾         家長狀態、場景、資源、時間
6. 優先排序         零花費 > 低收拾 > 短準備時間
7. 歷史降權         近 7 天出現過的活動降 30% 分數
```

---

## AI 安全規則（不能跳過）

1. **白名單驗證**所有 AI 輸入（stageKey、capabilityKeys、parentEnergy 等）
2. **Safety Filter** 在所有 AI 輸出後執行，失敗降回規則式推薦
3. AI Key 不寫 Log，不存資料庫，Request 結束釋放
4. AI 請求速率限制：每用戶每分鐘 10 次（Upstash Redis）
5. AI 回應快取：相同輸入參數 TTL 24 小時（Upstash Redis，Sprint 7）

---

## 絕對不能做的事

- 不要在 client 端存任何 API Key（用 Secure Storage / sessionStorage）
- 不要用 `NEXT_PUBLIC_` 前綴存敏感值
- 不要讓 AI 輸出跳過 Safety Filter
- 不要用真實孩子資料測試（用 seed 假資料）
- 不要直接修改舊的 migration 檔案（只能新增）
- 不要在沒有 RLS 的情況下部署任何資料表
- 不要傳孩子暱稱或生日給 AI API
- 不要使用 `dangerouslySetInnerHTML`
- 不要在 Log 中輸出 `Authorization` Header
- 不要用 Drizzle 執行查詢（只用於 Schema 定義）
- 不要在 Makefile 用 `git add -A`（用明確路徑）

---

## 命名規範

| 類型 | 規範 | 範例 |
|---|---|---|
| 資料表 | snake_case | `companion_logs` |
| TypeScript 型別 | PascalCase | `CompanionLog` |
| React 元件 | PascalCase | `ActivityCard.tsx` |
| 函式 | camelCase | `getRecommendations` |
| 常數 | UPPER_SNAKE_CASE | `MAX_DAILY_AI_CALLS` |
| 檔案 | kebab-case | `activity-card.tsx` |
| Zustand store | camelCase + Store | `useChildStore` |

---

## 性能目標（分開定義）

| 指標 | 目標 | 測量方式 |
|---|---|---|
| 首次載入（4G）| < 3 秒 | Lighthouse |
| 推薦 API P95 | < 2 秒 | Sentry Performance |
| 完整用戶流程（家長選完拿到推薦）| < 30 秒 | Playwright 計時 |
| AI 生成 P95 | < 15 秒（超時降回規則）| Upstash 監控 |
| APK 大小 | < 20MB | EAS Build 報告 |

---

## iOS / Android / Web 平台注意事項

### iOS PWA 限制（Web 在 iOS Safari）
- iOS 16.4 以下：PWA 不支援 Push Notification
- `env(safe-area-inset-bottom)` 需測試 Safari 相容性
- PWA 安裝提示需要手動引導（iOS 沒有自動橫幅）
- 建議在 Sprint 3 加 「在 iPhone 上安裝」說明頁

### Apple Developer（個人帳號即可）
- 費用：$99 USD/年
- EAS Build 支援雲端 iOS 編譯（不需要 Mac）
- TestFlight 用於 Beta 測試
- App Store 審核通常 1–3 天

### Google Play（個人帳號即可）
- 費用：$25 USD 一次性
- 審核通常比 Apple 快

### Expo Updates（OTA 熱更新）
- 不需要等 App Store 審核就能推 JS 層修正
- Native 層（原生模組）更改還是需要完整 build

---

## 付費架構（個人開發者）

### Web：LemonSqueezy（取代 Stripe）
- 個人帳號即可，不需要公司行號
- 自動處理全球 VAT、台灣稅務
- 付款頁面可嵌入或跳轉
- Webhook 整合，schema 簡單

### Mobile：RevenueCat
- 統一管理 Apple IAP + Google Play Billing
- 兩個 Store 都必須用原生付費，不能繞過
- RevenueCat Dashboard 統一查看訂閱狀態

### 注意事項
- Apple 抽成 30%（第一年後降至 15%）
- Google Play 抽成 15%
- LemonSqueezy 抽成約 5% + $0.5/交易

---

## Supabase 免費方案限制

- 資料庫：500MB（MVP 夠用）
- Auth MAU：50,000（夠用）
- **閒置 7 天會自動暫停 database**
  - 解法：用 Better Uptime 或 UptimeRobot 每 5 分鐘 ping `/api/health`
  - 或 Sprint 10 商業化時升 Pro（$25/月）

---

## 無障礙設計要求（Sprint 3 驗收）

- WCAG 2.1 AA 色彩對比（#FF6B35 暖橘需驗證對比值 ≥ 4.5:1）
- 所有 emoji 按鈕加 `aria-label`
- 支援 `prefers-reduced-motion`（動態完全停用）
- 圖示按鈕最小點擊區域 44×44px
- 使用 shadcn/ui 元件（Radix UI 底層，已具備 a11y）

---

## Commit 格式

```
feat: 新功能
fix: 修 bug
security: 資安修復
chore: 維護工作
docs: 文件更新
test: 測試相關
perf: 性能優化
```

---

## 部署流程（重要）

```
日常開發：
  make dev                    # 本機開發
  git add <files>
  make preview-deploy         # push develop → Zeabur 自動部署 staging

發正式版：
  make ship                   # push develop → 印出 PR 連結
                              # 在 GitHub 開 PR develop → main
                              # CI 通過 → 合併 → Zeabur 自動部署 production
```

**GitHub Branch Protection（一次性設定）：**
Settings → Branches → Add rule → `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass: `test`（preview.yml 的 job 名稱）
- ✅ Do not allow bypassing the above settings

這樣 production 永遠只部署通過 CI 的版本。

## 部署前安全檢查

```bash
make check-secrets   # 掃描硬寫的 API Key
make audit           # 檢查套件漏洞
make lint            # Biome 檢查
```
