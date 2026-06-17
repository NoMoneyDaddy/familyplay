# HANDOFF — 工作接續說明（給下一個 session）

> **一句話啟動指令**（下個 session 貼這句即可）：
> 「請讀 `HANDOFF.md`，依『待辦清單』由上到下逐項執行到完成；每完成一項就開 PR → `main` 並確認 CI 綠燈，遇到需要我決策的再問我。先用 Supabase / Zeabur MCP 確認線上狀態。」

最後更新：2026-06-17

---

## 目前狀態（`main` 已有）

- **推薦引擎**：`packages/core/src/recommendation-engine.ts`（7 步）+ 測試
- **Auth**：Supabase Google OAuth + `middleware.ts`（@supabase/ssr，RLS）
- **API**：`/api/recommend`（auth-gated）、children、households、logs、account、lemon、auth/*
- **Web**：可安裝 PWA、`error/global-error/not-found/loading/offline`、Sentry
- **安全**（PR #16）：timing-safe webhook、auth 速率限制、輸入驗證、錯誤訊息不外洩
- **DB**：Supabase 專案 `jojubbjwxdnwbrjxwytf`（ap-south-1，ACTIVE_HEALTHY），13 表全 RLS
- **CI/部署**：`main` push → Zeabur 自動部署（Dockerfile + standalone）；`production.yml` 自動 `supabase db push`

## 關鍵約束（務必遵守）

- **單一正式分支 `main`**：功能分支 → PR → `main`（CI 守門）→ 合併即部署。**無 develop/staging**。
- **DB 一律走 RLS**（`@supabase/ssr` 使用者 session）；**不要用 service role 繞過**；Drizzle 只用於型別。
- **機密**：勿硬寫、勿 `NEXT_PUBLIC_` 放敏感值、勿提交 `.env.local`。已外洩的 token 請輪替。
- migration 只新增不改舊檔；遷移歷史已與 repo 對齊（見下）。

## DB 遷移歷史（已對齊，2026-06-17 修復）

`schema_migrations` = repo 檔案：`20260616000000_initial_schema`、`20260617000000_structural_fixes`、
`20260617000001_harden_function_security`、`20260618000000_function_security_hardening`。
→ 下次合併 `main` 時 `supabase db push` 會正確且自動執行（不再因版本漂移失敗）。

---

## 待辦清單（依優先序）

1. **確認 Zeabur 部署**（需新 session 載入 Zeabur MCP）
   - 列 service、查最近部署（#16、#13 合併後）是否成功、讀 build log
   - 確認環境變數：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`PRODUCTION_DATABASE_URL`、Sentry/Telegram/LemonSqueezy 等
2. **刪除無用分支**（需有刪除權限的環境執行；本沙箱 git delete 被 403）
   ```bash
   git push origin --delete develop devin/1781676548-security-audit \
     claude/web-commercial-polish worktree-agent-aca52f15c1ae85cae worktree-agent-ad5789236bcc0c44a
   ```
   （`claude/commercial-grade-review-x9k2m`、`claude/project-review-execution-4efmx7`、
   `feat/wcag-2.1-aa-compliance` 各有未合併 commit，確認後再刪。）
3. **dependabot 大版號逐一升級**（各自獨立分支，更新 `pnpm-lock.yaml` + 跑 biome/type-check/test/build 後再 PR）：
   - 低風險先做：`drizzle-orm` 0.45（型別用）、`expo` group（mobile）
   - 高風險分開謹慎：`next` 15→**16**、`@supabase/ssr` 0.5→**0.12**、dev-deps（TS **6** / Biome **2** / Vitest **4**，注意 Biome 設定格式變更）
4. **行動端（Expo）**：對齊 web 的登入 + 推薦流程
5. **付費**：LemonSqueezy（web）/ RevenueCat（mobile）整合與 UI
6. **無障礙 / i18n / 效能**：WCAG 驗證、pricing/entitlements zh-TW、首屏 <3s

## 已關閉、不要重開

- PR #17（`claude/project-production-optimization-hpvm7k`）已關閉：內容與 `main` 重複（main 已有等價引擎/auth）。**勿重開、勿重做相同變更**。

## 驗證指令

```bash
pnpm install
pnpm biome check .          # 0 error
pnpm turbo type-check       # all pass
pnpm turbo test             # all pass
pnpm --filter @familyplay/web exec next build
```
