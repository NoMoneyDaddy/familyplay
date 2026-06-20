# ULTIMATE PROJECT STRATEGY — FamilyPlay 終極戰略白皮書

> 全維度技術資產審計 × 黑天鵝風險評估 × MVP 商業增長深度發想
> 產出日期：2026-06-20 ｜ 方法：多智能體矩陣（4 象限並行）＋ Git 熱點分析＋本地 gate 驗證
> 範圍：純唯讀審計與規劃，**未改動任何業務原始碼**。本檔為唯一交付物。

---

## 0. 執行摘要（TL;DR）

FamilyPlay 是一個**工程紀律明顯高於一般 MVP** 的專案：依賴圖無環、`CLAUDE.md` 鐵律（Drizzle 只定義型別、所有 DB 走 RLS）100% 落實、AI 安全（白名單輸入＋Safety Filter＋不傳孩子個資＋金鑰用完即丟）紮實、外部依賴韌性（逾時／降級／等冪／fail-closed 取捨）皆為刻意設計且有註解。**未發現高風險資安漏洞**（無 RLS 繞過、無 PII 外洩、無 XSS／注入、無 copyleft 污染、無金鑰 client 端持久化）。

真正的系統性風險集中在三點，且彼此獨立、皆可獨立修復：

| # | 系統性風險 | 等級 | 一句話 |
|---|-----------|------|--------|
| A | **線上可觀測性殘缺** | 🔴 高 | `reportError` 只帶 route、無 userId/childId、無 request-id、Sentry 無 `setUser`、多個 route 靜默吞錯 → 災情時運維**無法 5 分鐘內定位受影響用戶** |
| B | **API route 層 0 自動化測試** | 🔴 高 | 27 個 route handler 無整合測試；最精巧的韌性邏輯（降級／等冪／限流／配額）全無回歸護欄 → 交給 AI 自動維護時最大盲點 |
| C | **商業化『水管鋪好、水龍頭沒開』** | 🟠 中（商業） | RevenueCat／Web Billing／Plus 配額 RPC 全寫好，但 Plus 卡 `comingSoon`、2 個 migration 未套用、廣告未渲染 → **既有收入引擎未啟動** |

商業面最大的洞見是：**大量留存資產（streak 連續天數、weekly insights、Step8 反應自適應）已經算好，但對用戶不可見** — 幾乎零後端成本就能大幅拉升留存。

---

## 1. 審計方法與基線

| 項目 | 結果 |
|------|------|
| 技術棧 | pnpm + turbo monorepo；`apps/web` Next.js 16 + React 19（PWA、standalone）、`apps/mobile` Expo 56 + RN 0.85 + Expo Router；`packages/{core,data,ai,assessment,capabilities,db}` |
| 本地 gate | `biome check` ✅0、`turbo type-check` ✅0、`turbo test` ✅0（全綠） |
| 提交數 / 主要貢獻者 | 59 commits（奶爸 58 / Claude 32 共筆） |
| Git 熱點（churn） | `recommendations/page.tsx`×9、`now/page.tsx`×7、`history/page.tsx`×7、`components/ui.tsx`×5、`api/recommendations/route.ts`×5、`packages/data/src/index.ts`×5 |
| 最大檔案 | `ui.tsx` 686、`history/page.tsx` 455、`activity/[id]/page.tsx` 408、`try/page.tsx` 382、`now/page.tsx` 364、`recommendation-engine.ts` 361 |
| CI 守門 | `.github/workflows`：TruffleHog secret scan → biome → type-check → test（PR→main 強制）；commit hooks 同步把關 |

---

## 象限一：技術防禦力與隱形風險

### ✅ 強項
- **依賴圖無環**：`core` 為葉節點被全體依賴；`data/ai/assessment/capabilities` 僅依賴 `core`；無循環依賴。
- **Drizzle 鐵律 100%**：`apps/` 內 0 筆 `from '@familyplay/db'` 查詢、0 筆 `db.select(`/`drizzle(` 執行。
- **併發 fail-closed**：`packages/data/src/recommend.ts:192-202` 四查詢 `Promise.all` 任一失敗即丟 `RecommendError`，不靜默退化（範本級）。
- **資安乾淨**：0 筆 `dangerouslySetInnerHTML`、無字串拼接 SQL、Zod 全端點驗證、PII 不傳 AI（`api/ai/activity/route.ts` 只傳 stageKey/能力 key/精力）、BYO 金鑰只存 sessionStorage、service-role 僅在正當位置（webhook/RPC/admin/seed）、node_modules 0 筆 AGPL/GPL。

### ⚠️ 風險清單

| 等級 | 發現 | 位置 | 技術成因 | 影響 / 修復方向 |
|------|------|------|---------|----------------|
| 🟠 中 | 主推薦 `load()` 無 in-flight 取消 | `apps/web/app/recommendations/page.tsx` `load()` | 快速連點「換一批」多個 POST 亂序回來，`seenIds.current` 與 `setRecommendations` 競態 | 結果閃跳/重複；以 `AbortController` ref 在新請求前 abort 舊的 |
| 🟠 中 | activity row 映射在 `/api/try` 重複手刻 | `apps/web/app/api/try/route.ts:77-94` | 與 `mapActivityRow` 幾乎相同但獨立維護 | schema 欄位變動兩處漂移；抽 `mapActivityRow` 共用 |
| 🟠 中 | web API 路由大量直連 `.from()` | `api/logs`、`api/saved`、`api/capabilities`、`api/profile` 等 | `@familyplay/data` 已有對應函式、mobile 全採用，web 僅 6 檔使用 | **兩端邏輯漂移最大來源**；逐步收斂到 data 層 |
| 🟠 中 | 高風險依賴用 `^`/`~` 浮動 | 各 `package.json` + CI | `next ^16`/`react ^19`/`expo ^56`/`react-native ^0.85` 浮動範圍 | 未來 minor 升版可能引入未測破壞；CI 強制 `--frozen-lockfile`、高風險套件鎖精確版 |
| 🟢 低 | 疑似死碼 `/api/recommend`（form-action 版） | `apps/web/app/api/recommend/route.ts` | 無任何前端引用（已 grep 確認） | 移除以免與 `/api/recommendations` 混淆 |
| 🟢 低 | webhook 為共享密鑰比對而非 payload 簽章 | `lib/payment/revenuecat.ts:68-72` | RevenueCat 用固定 Authorization header（已 `timingSafeEqual`） | 可接受；安全性依賴密鑰機密性與 TLS |

---

## 象限二：極端生存力與 AI 準備度

### ✅ 強項（韌性工程紮實，未發現雪崩單點）
- **AI Provider**：`packages/ai/src/providers.ts` 每個 provider `AbortController`+12s 逾時、`finally` 清 timer；`api/ai/activity/route.ts` 最外層 catch-all 把所有未預期例外上報後安靜降回規則式（符合「Safety Filter 失敗降回規則式」）。
- **限流真接上**：`checkRateLimit('ai:${user.id}', 10, false)` — 10 req/min 且 **fail-closed**（成本敏感端點正確取捨）。
- **SSRF 防護**：ollama base URL 只能取自 server env、擋 localhost 回退。
- **Plus 配額防超扣**：`consume_plus_ai_call` RPC 用 `SELECT ... FOR UPDATE` 行鎖、`SECURITY DEFINER`+`search_path=''`、扣額在呼叫前、失敗才 refund、refund 只授權 service_role（防自助刷額）。
- **RevenueCat Webhook**：先 claim `processed_webhooks(provider,event_id)`、`try/finally`+`completed` 旗標在未成功時 `releaseDedupe()`（避免「claim 後寫入失敗 → 永久標記已處理 → entitlement 永不更新」陷阱）。
- **Upstash 限流**：認證端點 fail-open（不擋真實用戶）、公開/濫用敏感端點 fail-closed — 取捨正確。
- **Sentry**：`observability.ts` 包 try/catch，未初始化不影響主流程。

### ⚠️ 風險清單

| 等級 | 發現 | 位置 | 影響 |
|------|------|------|------|
| 🔴 高 | **API route 層 0 自動化測試** | 27 個 `app/api/**/route.ts`；`__tests__/smoke.test.ts` 是 `expect(true)` 佔位；Playwright e2e 刻意不打後端 | 降級／等冪／限流 fail-closed／配額 consume-refund 順序——最精巧的韌性邏輯**全無回歸保護**。AI 改 route 時沒有安全網 → 補 route handler 整合測試（mock supabase/provider），優先 `ai/activity`、`revenuecat/webhook`、`recommendations` |
| 🟠 中 | 編排路徑測試薄 | `packages/data/src/recommend.ts` `fetchRecommendations` fail-closed 分支、webhook dedupe-release 流程 | 純函式（`mapActivityRow`/`allRecommendationsSeen`）已測，但有副作用的編排分支未覆蓋 |
| 🟢 低 | 生產 `as any` 收斂 | `children/[id]/route.ts:17,39`、`households/members/route.ts:92`、`logs/route.ts:104,116` | 皆 Supabase nested relation；用 DB 型別或顯式 interface 取代，提升 AI 改動時的型別防護 |

### AI 友善度評語
模組邊界清楚、型別清晰（生產碼僅 3 處 `as any`）、CLAUDE.md 護欄明確且註解多直接引用安全規則編號、工具化完整（lint/type/test + CI + hooks）。**唯一系統性盲點是 API route 缺測試** — 這正是交給 AI 自動維護時最需要的護欄。

---

## 象限三：團隊交付與營運體驗

### 🔴 客服運維（Support）— 最高風險區
線上災情時，一線運維**無法在 5 分鐘內定位「哪個用戶、哪個孩子」**。

| 等級 | 發現 | 位置 | 營運影響 |
|------|------|------|---------|
| 🔴 高 | `reportError` Context 殘缺，~28 個呼叫點幾乎只傳 `{ route }` | `apps/web/lib/observability.ts:6-14` | Sentry 收到「/api/children 失敗」卻不知哪個帳號/孩子；客訴「我加不了小孩」無法反查 → 簽名加 `userId?/childId?/requestId?`，route 補傳 |
| 🔴 高 | 無 Request ID / Trace ID 串接 | 全專案 grep 不到 | middleware→route→Supabase→Sentry 無法串成一條鏈；同用戶同秒多 log 無法聚合 |
| 🟠 中 | Sentry 無 `setUser` scope | `sentry.server.config.ts`（已正確脫敏 header） | 錯誤無法按用戶分群 → 認證入口 `Sentry.setUser({ id: user.id })` |
| 🟠 中 | catch 吞錯、靜默 500 不上報（已逐一驗證） | `api/logs/route.ts:132`、`logs/[id]/route.ts:103,155`、`children/list/route.ts:61`（空 catch）、`children/[id]` 用裸 `console.error` 非 `reportError` | 這些路徑線上 500 在監控看不到，只能靠用戶回報 |
| 🟠 中 | 回應 body 兩極化 | 部分回 `error.message`（可能洩漏 OAuth 內部訊息）、部分過度模糊無錯誤碼 | debug 困難 → 統一錯誤碼表 |
| 🟢 低 | `/api/capabilities` 無 rate limit | 同上 | 補上 |

### 開發者體驗（DX）

| 等級 | 發現 | 位置 |
|------|------|------|
| 🟠 中（真 bug） | **PostHog 變數名不一致**：`.env.example` 寫 `NEXT_PUBLIC_POSTHOG_KEY/HOST`，但 server 端讀 `POSTHOG_API_KEY/POSTHOG_PROJECT_ID/POSTHOG_HOST` | `lib/admin/metrics.ts:186-188` → 照文件設定 admin 指標**必壞** |
| 🟠 中 | 13 個 env 在程式碼引用但 `.env.example` 未記載 | `ADMIN_EMAILS`/`CRON_SECRET`/`GITHUB_TOKEN`/`GITHUB_REPO`/`POSTHOG_*`/`VAPID_*`/`SENTRY_URL` |
| 🟢 低 | 缺集中式 env 驗證（無啟動期 zod schema） | 26/27 route 各自 inline `process.env.X` |

> **正面**：`recommendation-engine.ts`（361 行）結構優秀——七步函式各自獨立、fail-safe 註解完整（NaN→fail closed、壞 stageKey→newborn）、魔術數字皆抽具名常數。**此檔是全專案註解最佳範例，不需拆。**

### 專案管理（PM）— God File 解耦與 Story Points

| 優先 | 檔案 | 行數／churn | 問題 | 拆分方向 | SP |
|------|------|-----------|------|---------|----|
| 1 | `components/ui.tsx` | 686／×5 | 30+ export 混 icon/button/form/callout/layout/activity-meta | 拆 `ui/{icons,buttons,form,callout,layout}.tsx`+barrel | **5** |
| 2 | `history/page.tsx` | 455／×7 | 9 個 useState，讀/編/刪/週統計混雜 | 抽 `useHistoryLogs` + `HistoryStats`/`LogList` | **5** |
| 3 | `activity/[id]/page.tsx` | 408／×4 | 12 個 useState，詳情/記錄/慶祝/收藏四流程 | 抽 `useActivityDetail` + `ActivityLoggingCard`/`CelebrationOverlay` | **5** |
| 4 | `now/page.tsx`+`try/page.tsx` | 364+382／×7+4 | 70% 邏輯重複、型別重名（`Rec` vs `Recommendation`） | 共用 `useRecommendation` hook + `RecommendationCard` + `ContextSelector` | **8** |
| 5 | `recommendations/page.tsx` | 316／**×9 最高 churn** | 變動最頻繁＝衝突最痛 | 與 #4 共用 `RecommendationCard`/型別，抽資料抓取 hook | **3** |

> 建議**先做 #1**（ui.tsx，churn 高、影響全站 import、純機械拆分風險最低）。

---

## 象限四：MVP 商業化與 Phase 2 深度發想

### 4.0 產品現況逆向工程
- **核心價值主張**：疲憊家長 → 30 秒拿到一個能立即執行的陪伴方案。`/now` 是真正核心（不問年齡/精力/情境，依時段自動帶情境 19 點後=bedtime，直接給「一個」答案，玩完一鍵記錄）。
- **TA**：0–5 歲主要照顧者；多人家庭（owner/caregiver/viewer + 交接小卡 → 含配偶/長輩/保母）；隱私敏感（假暱稱、不存完整生日、Plus 筆記客戶端加密）；台灣繁中市場（`Asia/Taipei` 硬編）。
- **方案分級**（`entitlements.plan`）：`free`（完整核心永久免費）｜`supporter` NT$90/月（去廣告＋家庭共享）｜`plus` NT$170/月（託管 AI 100 次＋加密筆記＋交接摘要，**目前 `comingSoon`**）。
- **關鍵發現：商業化水管已鋪好、水龍頭沒開**。RevenueCat webhook／Web Billing／Plus 配額 RPC／防自助升級 RLS 全寫好，但 ① Plus 卡 `comingSoon`、② 2 個 migration（`set_child_capability`、`consume_plus_ai_call`）未套用、③ `sponsor_cards` 表建好但前端未渲染（Supporter「去廣告」賣點不成立）。

### 4.1 PMF 留存鉤子（habit-forming）

| # | 發想 | 用戶價值 | 商業影響 | 難度 |
|---|------|---------|---------|------|
| H1 | **Streak 視覺化＋streak freeze 寬限** | 損失趨避是最強習慣引擎 | 留存↑↑ | 低（`fetchStreak` 已有，純前端） |
| H2 | **里程碑「達成慶祝」＋成長相簿** | 情感高峰、可截圖分享 | 口碑↑、轉付費 | 中（需記 `achieved_at`，目前只存 boolean map） |
| H3 | **每週「陪伴回顧」推播＋卡片** | 「你做得很好」的正向回饋 | 留存↑、回訪 | 低（`WeeklyInsights`＋push 基礎已備） |
| H4 | **Step8「孩子越來越懂你」露出** | 個人化感知＝黏著 | 留存↑、付費感知 | 低（`reasons` 已產生，純前端露出） |
| H5 | **「今晚的睡前儀式」連續流**（2–3 步 routine） | routine＝最強習慣容器 | 留存↑↑ | 中（引擎需支援序列推薦） |
| H6 | **照顧者協作動態牆**（今天爸爸陪積木、奶奶讀繪本） | 家庭參與感 | 留存↑、Supporter 轉換 | 中（既有資料聚合） |

> **最高槓桿**：H1＋H3＋H4 都是「資料已算好、只差露出」，幾乎零後端成本拉留存。

### 4.2 變現引擎與付費牆誘餌

**待補（阻塞變現）**：套用 2 個 migration → 交付 Plus 真實價值（加密筆記 UI＋交接摘要持久化）→ 拿掉 `comingSoon` → 開 Plus 結帳；接 `sponsor_cards` 廣告渲染讓 Supporter 成立；清理棄用的 `lemonSqueezySubscriptionId` 欄位。

| 付費牆誘餌 | 放在哪 | 為何有效 |
|-----------|--------|---------|
| AI 生成「都看過了」出口 | `/now` exhausted 的 `AIGenerateCard` | 免費版要 BYO key（高摩擦）→ Plus 託管一鍵；用戶已表達「想要更多」 |
| 完整歷史 / 匯出 | `/history`（近 7 天牆） | 成長紀錄＝情感資產，製造「不想失去」 |
| 交接摘要 AI 強化 | `/handoff` | 長輩/保母家庭剛需，付費意願高 |
| 成長相簿 / 里程碑 PDF | 里程碑頁 | 可分享送長輩 → 口碑＋付費 |

### 4.3 生態系（台灣優先 LINE）

| 整合 | 商業影響 | 難度 |
|------|---------|------|
| **LINE 分享圖卡（OG image）** | 口碑↑↑（病毒係數）、低成本獲客 | 低（handoff `navigator.share` 已就緒） |
| LINE Notify/Bot 推播 | 觸達率遠高於 web-push（iOS 限制多） | 中 |
| LINE Login | 台灣註冊轉換↑ | 低–中 |
| Apple/Google 家庭共享訂閱 | 一人付費全家用，符合定位 | 中（RevenueCat 原生支援） |

> **LINE 分享圖卡是 CP 值最高的成長槓桿**：handoff/里程碑/週回顧本就為「分享給家人」設計。

### 4.4 AI 智能增長點（皆在現有安全框架內，只傳 stageKey/能力 key/聚合統計）

| # | AI 升級 | 商業影響 | 難度 |
|---|---------|---------|------|
| AI1 | **個人化週報 AI 化**（insights＋ZPD → 溫暖教養短評） | Plus 旗艦賣點 | 中 |
| AI2 | **交接小卡 AI 強化＋持久化**（`handoff_summaries` 表已建） | Plus 付費理由 | 中 |
| AI3 | **自然語言記錄**（「今天玩黏土玩超久很開心」→ 抽 activity/outcome/reaction 寫 log） | 留存↑、**資料飛輪入口** | 中–高 |
| AI4 | **發展預警**（某域落後 `typicalMonths` → 溫和提示，須免責不診斷） | 強付費理由、口碑 | 中（法務敏感） |
| AI5 | **AI 活動「為什麼適合」說明**（`zpdTargets`/`developmentalFocus` 已有） | 付費感知價值 | 低 |

> **資料飛輪**：AI3（降低記錄摩擦）→ 更多 `companion_logs` → 餵養 Step8 個人化＋streak＋週報＋交接卡 → 留存與付費理由全面增強。

---

## 2. 影響力 vs 執行難度 ROI 矩陣

```
        高影響力
          │
  ┌───────┼───────────────────────────┐
  │  [主要工程]                        │
  │  • API route 整合測試(風險B護欄)   │   [快速致勝 Quick Wins]
  │  • 交付Plus價值→開結帳(風險C)      │   • reportError 補 user/child context(風險A)
  │  • AI3 自然語言記錄(資料飛輪)      │   • 補吞錯 reportError + setUser(風險A)
  │  • Request/Trace ID 鏈路(風險A)    │   • 修 .env PostHog 變數名(真bug)
  │  • now+try 去重(SP8)               │   • 套用2個 migration(解鎖變現)
  │  • AI1 AI週報                      │   • H1 streak / H3 週報 / H4 個人化露出
  │                                    │   • H5 睡前儀式流                   • AI5 活動說明
  │                                    │   • LINE 分享圖卡
高├────────────────────────────────────┼───────────────────────────────────┤低
難│  [審慎評估 / 漸進]                  │   [填空 Fill-ins]                   │難
度│  • God File 拆分 ui.tsx/history…    │   • 移除死碼 /api/recommend          │度
  │  • AI4 發展預警(法務敏感)          │   • 清理 lemonSqueezy 欄位           │
  │  • 家庭共享訂閱                    │   • 3處 as any 收斂                  │
  │  • web API 全面收斂到 data 層      │   • /api/capabilities rate limit     │
  │  • H2 成長相簿(需 achieved_at)     │   • /api/try mapActivityRow 去重     │
  └───────┼───────────────────────────┘
          │
        低影響力
```

---

## 3. 演進路線圖（Phase 1 → 3）

### 🩹 Phase 1 — 止血與解鎖（1–2 sprints｜風險 A/C 優先）
> 目標：線上可診斷 + 解鎖變現基礎。皆為高 CP 值、低風險。
1. **可觀測性止血**（風險 A）：`reportError` 簽名加 `userId?/childId?/requestId?` 並於 route 補傳；認證入口 `Sentry.setUser`；補齊 `logs`/`logs/[id]`/`children/list`/`children/[id]` 的 `reportError`（消除靜默 500）。
2. **環境修正**：修 `.env.example` PostHog 變數名不一致（真 bug）＋補 13 個缺漏 env。
3. **解鎖變現基礎**：套用 `set_child_capability`、`consume_plus_ai_call` 兩個 migration（手動，依 `CURRENT_SPRINT.md`）。
4. **競態修復**：`recommendations/page.tsx` `load()` 加 AbortController。
5. **零後端留存露出**：H1 streak 視覺化、H3 週回顧推播、H4 Step8 個人化露出、AI5 活動說明。

### 🚀 Phase 2 — 護欄與變現（2–4 sprints｜風險 B + 收入）
> 目標：建立回歸護欄 + 真正開始收錢。
1. **API route 整合測試**（風險 B）：優先 `ai/activity`（降級/限流/配額）、`revenuecat/webhook`（等冪/釋放）、`recommendations`（fail-closed）。
2. **交付 Plus 真實價值 → 開結帳**：加密筆記 UI＋AI2 交接摘要持久化（`handoff_summaries`）→ 拿掉 `comingSoon`。
3. **`sponsor_cards` 廣告渲染** → Supporter「去廣告」賣點成立。
4. **LINE 分享圖卡（OG image）＋ LINE Login**：低成本獲客引擎。
5. **技術債漸進**：web API 收斂到 `@familyplay/data`（先 `api/logs`/`api/saved`）、`/api/try` 共用 `mapActivityRow`、移除死碼 `/api/recommend`、ui.tsx 拆分（SP5）。
6. **依賴穩定**：CI 強制 `--frozen-lockfile`、高風險套件鎖精確版。

### 🧠 Phase 3 — 智能增長與生態縱深（持續）
> 目標：資料飛輪 + 生態擴張 + AI 旗艦差異化。
1. **AI3 自然語言記錄**（資料飛輪入口，輸出過 Safety Filter + 白名單）。
2. **AI1 個人化 AI 週報**（Plus 旗艦）。
3. **H5 睡前儀式連續流**（引擎序列推薦）、**H6 照顧者協作動態牆**、**H2 成長相簿/里程碑 PDF**（補 `achieved_at`）。
4. **LINE Notify/Bot 推播**、**Apple/Google 家庭共享訂閱**。
5. **AI4 發展預警**（法務先行：免責、不診斷、連結 `/disclaimer`）。
6. **God File 持續解耦**（now+try 去重 SP8、history/activity 重構）。

---

## 4. 風險登記簿（Risk Register）速查

| ID | 風險 | 等級 | 象限 | 根因 | 影響 | Phase |
|----|------|------|------|------|------|-------|
| A1 | reportError 無 user/child context | 🔴 高 | 三 | 簽名未強制維度 | 災情無法定位用戶 | 1 |
| A2 | 無 request/trace id | 🔴 高 | 三 | 未生成傳播 | log 無法聚合 | 1–2 |
| A3 | 多 route 靜默吞錯 | 🟠 中 | 三 | catch 未 reportError | 線上 500 監控看不到 | 1 |
| B1 | API route 0 測試 | 🔴 高 | 二 | 僅 UI e2e + 佔位 smoke | 韌性邏輯無回歸護欄 | 2 |
| C1 | Plus comingSoon + migration 未套用 | 🟠 中 | 四 | 核心未交付/未部署 | 收入引擎未啟動 | 1–2 |
| C2 | sponsor_cards 未渲染 | 🟠 中 | 四 | 前端缺元件 | Supporter 賣點不成立 | 2 |
| D1 | 推薦 load() 競態 | 🟠 中 | 一 | 無 in-flight 取消 | 結果閃跳 | 1 |
| D2 | web 路由未收斂 data 層 | 🟠 中 | 一 | 歷史遺留 | 兩端漂移 | 2 |
| D3 | 依賴 `^`/`~` 浮動 | 🟠 中 | 一 | 未鎖版 | 未來建置突崩 | 2 |
| E1 | PostHog env 變數名不一致 | 🟠 中 | 三 | 文件與讀取不符 | admin 指標必壞 | 1 |
| F1 | 死碼 `/api/recommend` | 🟢 低 | 一 | 殘留 | 混淆 | 2 |
| F2 | 3 處生產 as any | 🟢 低 | 二 | Supabase nested relation | 型別防護弱 | 2 |
| F3 | webhook 共享密鑰非簽章 | 🟢 低 | 一 | RevenueCat 機制 | 可接受 | — |

---

> **安全鐵律遵守聲明**：本任務全程唯讀，除生成本 `ULTIMATE_PROJECT_STRATEGY.md` 外**未改動任何業務原始碼**。後續任何重構或新功能開發，須待明確的代碼修改授權。
