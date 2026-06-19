# 目前進度 — Web UI 完整化 + 發展評估 + AI 生成

**狀態：** 核心 API 完成、Web UI 主要流程上線中。單一正式分支 `main`，PR → CI 綠燈 → 合併即 Zeabur 部署。

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

### 活動詳情
- [x] 顯示「會練到什麼能力/目標」
- [x] `/api/activities/[id]` 強化（UUID 驗證、DB 錯誤分類、Sentry）

### AI 客製活動生成
- [x] `packages/ai` provider 實作（Gemini/Groq/OpenAI/Ollama）+ 生成 prompt + 解析器
- [x] `POST /api/ai/activity`：免費版 BYO key、限流、Safety Filter、降回規則式
- [ ] 設定頁 BYO key UI（sessionStorage）+ `/now`「都看過了」接「AI 生一個」
- [ ] 託管/Plus 配額計次（需 service-role 寫 entitlements）

---

## 待手動套用 migration（CRITICAL）

複製到 Supabase Dashboard → SQL Editor 執行：

- `supabase/migrations/20260619100000_set_child_capability_rpc.sql`
  （里程碑原子寫入；未套用前 API 走退路仍可標記，但缺原子保證）

---

## 下一步候選

- AI 生成 UI 串接（設定頁 BYO key + /now 出口）
- 交接摘要、里程碑下一步建議（AI）
- 多孩子 UI/流程優化
- 首次導覽教學
- 行動端（Expo）UI、付費整合 UI、推送通知、離線、本地化

---

## 指令（CI 守門，見 CLAUDE.md）

```bash
pnpm install
pnpm biome check .
pnpm turbo type-check
pnpm turbo test
git push origin main   # → Zeabur 自動部署
```
