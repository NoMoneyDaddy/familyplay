# 目前進度 — Web UI 完整化 + 發展評估 + AI 生成

**狀態：** 核心 API 完成、Web UI 主要流程＋AI 生成上線中。單一正式分支 `main`，直接在 main 開發：本地驗證綠燈 → `git push origin main` 即 Zeabur 部署。

---

## 最近完成

### 全維度審計 + Phase 1 止血 + 護欄（依 `ULTIMATE_PROJECT_STRATEGY.md`）
- [x] 四象限全維度審計白皮書 `ULTIMATE_PROJECT_STRATEGY.md`（風險登記簿 + ROI 矩陣 + Phase 1–3 路線圖）
- [x] 修 `.env.example`：PostHog 變數名不一致（admin 指標必壞的真 bug）+ 補齊 13 個缺漏 env
- [x] 可觀測性止血（風險 A）：`reportError` 帶 userId/childId/requestId scope（Sentry setUser/tag）+ 補齊靜默吞錯端點（logs / logs/[id] / children/list / children/[id]）
- [x] 推薦 `load()` 防競態（風險 D1）：reqSeq 序號丟棄亂序回應 → 再加 `AbortController`
  真正取消被超車的舊請求（省伺服器白算），`fetchWithTimeout` 用 `AbortSignal.any`
  合併外部與逾時 signal（互不覆蓋）
- [x] Request/Trace ID 鏈路（風險 A2）：middleware 生成/轉發/回傳 `x-request-id`，
  route 以 `getRequestId` 帶入 `reportError`
- [x] `/now` 記錄後 streak 火苗 + 本週次數回饋（留存 H1 / H3-lite，零後端）
- [x] `/api/try` 共用 `mapActivityRow` + 移除死碼 `/api/recommend`（D2/F1）
- [x] `/api/saved` GET 收斂到 `@familyplay/data` `fetchSaved`（D2）：刪前端 `pickActivity`，
  消除三份重複關聯映射
- [x] API route 整合測試護欄（風險 B1）：核心三 route（recommendations/webhook/ai-activity）
  + log/insights/profile/children/capabilities/handoff + saved/logs[id]/children[id]
  + 家庭邀請 accept/generate + account/entitlements + fetch-timeout（web 161 測試）
- [x] 品牌分享圖（4.3 LINE 生態系）：`opengraph-image`（next/og，含中文字型子集載入，
  不含孩子資料）+ twitter `summary_large_image` + PWA `shortcuts`（長按直達 /now、里程碑）
- [x] 交接小卡持久化（AI2 持久化半部）：`handoff_summaries` 表 + `saveHandoff`/`fetchHandoffs`
  + `/api/handoff` POST/GET + 頁面「儲存這張小卡」

### 導覽 / 版面 / 易讀性
- [x] 活動詳情頁返回鍵 + 全站次級頁一致返回（共用 `useGoBack`，防跳出站外）
- [x] 首頁 `/now` 品牌（波波 + 站名）、間距收緊、底部導覽瘦身
- [x] 卡片理由白話化（`friendlyReasons`）

### 發展里程碑評估
- [x] `/capabilities` 重建為「發展里程碑」：分域、可點選標記、樂觀更新
- [x] `/api/capabilities` GET（已達成 map）+ PATCH（標記，白名單驗證）
- [x] 原子 RPC `set_child_capability`（並發安全 + 缺檔自我修復）
- [x] 標記後驅動推薦引擎 ZPD 評分
- [x] 里程碑頁顯示「接下來正在發展中」（ZPD 下一步建議，連到 /now）
- [x] 能力狀態型別硬化（`CapabilityProfile`/`CapabilityKey`，移除 unsafe cast）

### 活動詳情
- [x] 顯示「會練到什麼能力/目標」
- [x] `/api/activities/[id]` 強化（UUID 驗證、DB 錯誤分類、Sentry）

### AI 客製活動生成
- [x] `packages/ai` provider 實作（Gemini/Groq/OpenAI/Ollama）+ 生成 prompt + 解析器
- [x] `POST /api/ai/activity`：免費版 BYO key、限流、Safety Filter、降回規則式
- [x] 設定頁 BYO key UI（sessionStorage）+ `/now`「都看過了」接「AI 生一個」
- [x] 託管/Plus 配額計次：`consume_plus_ai_call`／`refund_plus_ai_call` RPC（SECURITY DEFINER、伺服器端定額），AI 端點無 BYO key 時走託管金鑰並原子扣配額、失敗退還；卡片 Plus 免設定

### 付費整合 UI（統一 RevenueCat）
- [x] 移除 LemonSqueezy（未實裝）：刪 `/api/lemon/*`＋lib，CSP／法務頁／env 改 RevenueCat
- [x] 後端 `/api/revenuecat/webhook`：驗 Authorization → idempotency → entitlement_ids/product 對應方案 → service-role upsert `entitlements`（前端不可自助升級）；純邏輯 + 10 單測
- [x] 行動端 App 內購：`lib/purchases.ts`（react-native-purchases）+ `pricing` 可購買；金鑰未設定即休眠
- [x] 網頁 Web Billing：`lib/payment/revenuecat-web.ts` + `plan-comparison` CTA 改走 RevenueCat；`/api/profile` 回 `userProfileId` 當 appUserId

### 首次導覽與多人家庭
- [x] `/now` 首次三步上手提示（一次性、localStorage、顯示即標記看過）
- [x] 陪伴紀錄顯示「誰陪的」（多人家庭：你/暱稱/家人；單人不顯示）
- [x] 修正家庭成員顯示 Unknown User（改用 `household_members.nickname`）
- [x] 交接小卡 `/handoff`：近況濃縮（階段/最近陪玩/發展中里程碑）+ 可分享（唯讀、不寫 DB、不送 AI）

### 推薦引擎自適應 + E2E
- [x] Step 8 反應自適應（加分層、不改 7 步）：core `buildReactionStats`/`applyReactionAffinity`，Web＋行動端帶入近 60 天反應，6 個新單測
- [x] 修好 Playwright 設定（config 移到 `apps/web`）＋更新/擴充 e2e（法務/方案/離線/試用表單），chromium 實跑全綠

### 行動端（Expo）
- [x] 核心推薦流程移植：`lib/recommend.ts`（端上編排 + `@familyplay/core` 七步，RLS 自動生效）+ `/recommendations` 畫面（選狀態/情境 → 3 方案 → 換一批）；修好 `select` 失效路由、首頁按鈕進流程；純函式加單元測試
- [x] 記錄一筆陪伴（閉環）：`lib/log.ts` + 推薦卡「做了這個」→ 選反應 → 寫 `companion_logs`（餵近 7 天降權）；household/caregiver 由 DB 推出、加單元測試
- [x] 發展里程碑評估：`lib/capabilities.ts` + `/milestones` 畫面（分域標記、樂觀更新、ZPD 下一步），標記驅動 ZPD/Step 8；`pickAchieved` 加單元測試
- [x] 陪伴歷史頁：`lib/history.ts` + `/history`（近 50 筆、活動/反應/結果/日期、空狀態），`mapLogRow` 加單元測試
- [x] 帳號/方案頁繁中＋暖色主題、修好失效登出（`/auth/logout` → `signOut`）
- [ ] 孩子管理畫面；RevenueCat 訂閱串接；可選抽 `packages/data` 去重 web/mobile 查詢

---

## Migration 狀態

正式專案（`jojubbjwxdnwbrjxwytf`）已套用（2026-06-20）：

- [x] `20260619100000_set_child_capability_rpc.sql`（里程碑原子寫入）
- [x] `20260703000000_consume_plus_ai_call_rpc.sql`（Plus 託管 AI 配額 consume/refund）
- [x] `20260704000000_lock_down_ai_quota_rpc_grants.sql`（**資安修正**：Supabase 預設權限
  會自動把新函式 EXECUTE 授予 anon/authenticated，使前一個 migration 的 REVOKE FROM
  PUBLIC 失效——驗證發現 refund_plus_ai_call 仍可被任何登入者刷額。已顯式撤回 anon/
  authenticated，refund 只留 service_role）

> 託管 AI 生成（Plus）後端路徑現已可運作。下一步：交付 Plus 真實價值後拿掉 pricing 的
> `comingSoon`、開放結帳。

---

## 下一步候選

- 行動端（Expo）UI（`apps/mobile`）：把 Web 的「現在就陪」「里程碑」「紀錄」流程移植到 Expo Router（沿用 `packages/core`／`packages/assessment`，金鑰用 Secure Storage）
- 付費整合 UI（web）已串：升級結帳＋訂閱管理入口完成；剩下 Plus 上架決策（核心交付確認後把 `plan-comparison` 的 Plus `comingSoon` 拿掉、設好 RevenueCat 商品/權益）與行動端 RevenueCat 串接
- [x] 交接摘要 AI 強化（AI2 完成）：`/api/ai/handoff` + `buildHandoffPrompt`/
  `sanitizeHandoffSummary`，把規則式現況交給 AI 寫成 2–3 句溫暖短評；輸入沿用與活動生成
  完全相同的白名單（只送 stageKey + 發展中能力，零新增資料面），走 Safety Filter、
  BYO/Plus 託管配額，失敗安靜降回規則式小卡；交接頁加「AI 潤色」按鈕、短評自動帶入分享/儲存
- [x] `sponsor_cards` 廣告渲染（C2）：`fetchActiveSponsorCards` + `/api/sponsors` +
  `SponsorSlot`（僅免費用戶可見、付費去廣告即隱藏），讓 Supporter「去廣告」賣點成立；
  抽 `lib/plan-cache` 與 AdSlot 共用一次 entitlements 查詢
- [x] Plus 結帳「一鍵開啟」基礎（C1 準備，先不收費）：付費卡改由「結帳就緒」判斷
  （`lib/plan-checkout`）——RevenueCat web key 未設時付費卡顯示「即將推出」（不再跳錯），
  Plus 另需 `NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED='true'` 才開。移除硬寫 `comingSoon`、
  誠實標記已交付的 Plus 功能（AI 生成/100 次/交接潤色）。RevenueCat 未設好＝全程休眠。

### Plus 上線 checklist（待 RevenueCat 後台就緒＋定價確認）
1. RevenueCat 後台建立 Plus 商品與 `plus` entitlement、Web Billing offering。
2. 設環境變數：`NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY`、`NEXT_PUBLIC_REVENUECAT_PLUS_PACKAGE`、
   `REVENUECAT_PLUS_ENTITLEMENT=plus`、webhook `REVENUECAT_WEBHOOK_AUTH`。
3. 確認可收費後，設 `NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED=true` → Plus 結帳即開放（無需改碼）。
4.（同理 Supporter：設好 key + `NEXT_PUBLIC_REVENUECAT_SUPPORTER_PACKAGE` 即自動開放。）
- 多孩子 UI/流程優化、推送通知、離線、本地化

---

## 指令（CI 守門，見 CLAUDE.md）

```bash
pnpm install
pnpm biome check .       # 全綠才 push
pnpm turbo type-check    # 全綠才 push
pnpm turbo test          # 全綠才 push
git push origin main     # 直接推 main，Zeabur 自動部署正式版（push 即上線）
```
