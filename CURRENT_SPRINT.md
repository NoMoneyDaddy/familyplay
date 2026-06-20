# 目前進度 — Web UI 完整化 + 發展評估 + AI 生成

**狀態：** 核心 API 完成、Web UI 主要流程＋AI 生成上線中。單一正式分支 `main`，直接在 main 開發：本地驗證綠燈 → `git push origin main` 即 Zeabur 部署。

---

## 最近完成

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

### 付費整合 UI（LemonSqueezy web）
- [x] 升級結帳已串：`/pricing`＋`plan-comparison` CTA →「成為支持者」打 `/api/lemon/create-checkout` 導向結帳，回來讀 `/api/profile`／`/api/account/entitlements` 反映方案（entitlements 只由 service-role webhook 寫，前端不可自助升級；Plus 仍標「即將推出」直到核心交付確認）
- [x] 訂閱管理可用：`GET /api/lemon/portal` 取 LemonSqueezy 客戶入口（更新付款／取消／恢復）；`/account/entitlements` 管理按鈕由 disabled 改為導向入口（含載入態/錯誤回報）

### 首次導覽與多人家庭
- [x] `/now` 首次三步上手提示（一次性、localStorage、顯示即標記看過）
- [x] 陪伴紀錄顯示「誰陪的」（多人家庭：你/暱稱/家人；單人不顯示）
- [x] 修正家庭成員顯示 Unknown User（改用 `household_members.nickname`）
- [x] 交接小卡 `/handoff`：近況濃縮（階段/最近陪玩/發展中里程碑）+ 可分享（唯讀、不寫 DB、不送 AI）

### 行動端（Expo）
- [x] 核心推薦流程移植：`lib/recommend.ts`（端上編排 + `@familyplay/core` 七步，RLS 自動生效）+ `/recommendations` 畫面（選狀態/情境 → 3 方案 → 換一批）；修好 `select` 失效路由、首頁按鈕進流程；純函式加單元測試
- [x] 記錄一筆陪伴（閉環）：`lib/log.ts` + 推薦卡「做了這個」→ 選反應 → 寫 `companion_logs`（餵近 7 天降權）；household/caregiver 由 DB 推出、加單元測試
- [ ] 里程碑評估、陪伴歷史、孩子管理畫面（待續）；推薦結果→活動詳情

---

## 待手動套用 migration（CRITICAL）

複製到 Supabase Dashboard → SQL Editor 執行：

- `supabase/migrations/20260619100000_set_child_capability_rpc.sql`
  （里程碑原子寫入；未套用前 API 走退路仍可標記，但缺原子保證）
- `supabase/migrations/20260703000000_consume_plus_ai_call_rpc.sql`
  （Plus 託管 AI 配額 consume/refund RPC；未套用前託管生成走不通、BYO 不受影響）

---

## 下一步候選

- 行動端（Expo）UI（`apps/mobile`）：把 Web 的「現在就陪」「里程碑」「紀錄」流程移植到 Expo Router（沿用 `packages/core`／`packages/assessment`，金鑰用 Secure Storage）
- 付費整合 UI（web）已串：升級結帳＋訂閱管理入口完成；剩下 Plus 上架決策（核心交付確認後把 `plan-comparison` 的 Plus `comingSoon` 拿掉、設好 `LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID`）與行動端 RevenueCat
- 交接摘要 AI 強化（目前 `/handoff` 為規則式唯讀；可選持久化到 `handoff_summaries`）
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
