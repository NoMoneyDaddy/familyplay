# Sprint 1 — 骨架與工具

**目標：** `make init && make dev` 5 分鐘內看到首頁

**狀態：** 🚧 進行中

---

## 📌 商轉優化進度更新（production-optimization）

這次把專案推進到「CI 全綠 + 核心引擎可用」：

**修復原本壞掉的 CI（先前無法通過自己的檢查）：**
- Biome 格式 / import 排序 / `button` 缺 `type`（20 個錯誤）
- Mobile `jest: not found`（改為明確 passthrough，共用邏輯測試集中在 core）
- Mobile NativeWind `className` 型別（新增 `nativewind-env.d.ts`）
- 各 `packages/*` 缺自己的 `tsconfig.json` → `tsc` 誤編整個 repo（已補上 scoped tsconfig）
- `packages/ai` 漏宣告 `@familyplay/core` 相依
- `emotional_crisis` 關鍵字遺漏「贏/比賽」導致既有測試一直失敗

**新增核心功能（Sprint 2 提前落地）：**
- ✅ 推薦引擎七步（`packages/core/src/recommendation.ts`，純 TS、無外部依賴）
- ✅ 內建啟動活動庫（`activity-catalog.ts`，9 筆覆蓋各階段）
- ✅ 推薦 API `POST /api/recommend`（Zod 白名單驗證，stageKey 由年齡推算不信任前端）
- ✅ 測試：core 43 + ai 10 + assessment 7 + web 12 = 72 個，全綠

**驗證指令（全部通過）：**
```bash
pnpm biome check .       # 0 error
pnpm turbo type-check    # 7/7
pnpm turbo test          # 72 tests pass
pnpm --filter @familyplay/web exec next build  # 含 /api/recommend
```

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
- [ ] `supabase/config.toml`（含 Google OAuth）
- [ ] 初始 Schema Migration（所有資料表）
- [ ] RLS Policy Migration（所有資料表）
- [ ] Seed 資料（示範孩子 + 30 個活動模板前 5 筆）

### GitHub Actions
- [x] `preview.yml`（develop branch，含 secret scanning）
- [x] `production.yml`（main branch）
- [ ] `dependabot.yml`（自動安全更新）

### Web App（apps/web）
- [ ] Next.js 15 基本設定
- [ ] HTTP Security Headers（next.config.ts）
- [ ] Supabase Auth（@supabase/ssr）
- [ ] 首頁骨架（/app/page.tsx）
- [ ] 全域 Layout

### Mobile App（apps/mobile）
- [ ] Expo 52 + Expo Router 基本設定
- [ ] eas.json（preview + production profile）
- [ ] expo-secure-store（BYOK key 儲存）
- [ ] expo-updates（OTA 熱更新）

### Packages 骨架
- [x] packages/core（stage-keys、capability-keys、safety-rules）
- [x] packages/ai（types、safety filter 骨架）
- [x] packages/db（Drizzle schema）
- [x] packages/assessment（發展域定義）
- [x] packages/capabilities（能力常數）

### Sentry 初始設定
- [ ] 安裝 @sentry/nextjs
- [ ] `beforeSend` 移除 Authorization Header
- [ ] 移除 Cookie Header

### Playwright 設定
- [ ] 三個斷點（375px / 390px / 360px）
- [ ] 基本 smoke test

### Vitest 設定
- [ ] packages/core vitest.config.ts
- [ ] 空的 test 檔案（讓 CI 通過）

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
