# Sprint 1 — 骨架與工具

**目標：** `make init && make dev` 5 分鐘內看到首頁

**狀態：** ✅ 完成

---

## 任務清單

### 環境與工具
- [x] Monorepo 結構（pnpm workspaces + Turbo）
- [x] Biome（Lint + Format，取代 ESLint + Prettier）
- [x] Makefile（含安全修正，不再 `git add -A`）
- [x] `.env.example`（含 LemonSqueezy、iOS 相關）
- [x] `.gitignore`（防止 `.env.local` 和 iOS 憑證被 commit）
- [x] `CLAUDE.md`（含所有架構決策）

### Supabase 設定
- [x] `supabase/config.toml`（含 Google OAuth）
- [x] 初始 Schema Migration（所有資料表）
- [x] RLS Policy Migration（所有資料表）
- [x] Seed 資料（示範孩子 + 30 個活動模板前 5 筆）

### GitHub Actions
- [x] `preview.yml`（develop branch，含 secret scanning）
- [x] `production.yml`（main branch）
- [x] `dependabot.yml`（自動安全更新）

### Web App（apps/web）
- [x] Next.js 15 基本設定
- [x] HTTP Security Headers（next.config.ts）
- [x] Supabase Auth（@supabase/ssr — lib/supabase/client.ts + server.ts + middleware.ts）
- [x] 首頁骨架（/app/page.tsx）
- [x] 全域 Layout

### Mobile App（apps/mobile）
- [x] Expo 52 + Expo Router 基本設定
- [x] eas.json（preview + production profile）
- [x] expo-secure-store（BYOK key 儲存）
- [x] expo-updates（OTA 熱更新）

### Packages 骨架
- [x] packages/core（stage-keys、capability-keys、safety-rules）
- [x] packages/ai（types、safety filter 骨架）
- [x] packages/db（Drizzle schema）
- [x] packages/assessment（發展域定義）
- [x] packages/capabilities（能力常數）

### Sentry 初始設定
- [x] 安裝 @sentry/nextjs
- [x] `beforeSend` 移除 Authorization Header
- [x] 移除 Cookie Header

### Playwright 設定
- [x] 三個斷點（375px / 390px / 360px）
- [x] 基本 smoke test

### Vitest 設定
- [x] packages/core vitest.config.ts
- [x] 空的 test 檔案（讓 CI 通過）

---

## 驗收標準

```bash
make init             # ✅ 5 分鐘內完成，看到成功訊息
make dev              # ✅ http://localhost:3000 可以打開
make preview-deploy   # ✅ Telegram 收到通知
make test             # ✅ 測試全部通過（包含 packages/core 空測試）
make lint             # ✅ Biome 沒有 error
make check-secrets    # ✅ 沒有硬寫的 API Key
```

---

## 下一個 Sprint

Sprint 2 — 核心推薦邏輯
- 年齡計算、stageKey 判斷
- 能力 Key 常數（全部 30 個）
- 里程碑時間線、ZPD 推算
- 安全規則（禁止材料清單）
- 推薦引擎 Step 1–7
- 保底活動
- Vitest 覆蓋率 > 90%
