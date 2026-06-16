# Sprint 4 — 日誌記錄 + 歷史管理

**目標：** 記錄陪伴活動 + 查看歷史紀錄

**狀態：** ✅ 完成（核心 API）

---

## 任務清單

### 日誌記錄 API
- [x] POST /api/log（childId, activityId, outcome, childReaction, durationSecs）
- [x] 驗證權限（user → household → child）
- [x] 記錄到 companion_logs

### 已完成（Sprint 1–3）
- [x] **Sprint 1** — 基礎設施（Supabase, Sentry, Auth helpers）
- [x] **Sprint 2** — 推薦引擎（7 步演算法 + API）
- [x] **Sprint 3** — 選擇流程（狀態選擇 + 推薦展示）

---

## 下一步（Sprint 5+）

若要達成 MVP：
- [ ] 登入/註冊 UI（Google OAuth 整合）
- [ ] 孩子新增頁面（birth_year_month 輸入）
- [ ] 活動詳細頁面 + 日誌按鈕
- [ ] 歷史紀錄頁面
- [ ] 家長邀請功能
- [ ] 行動應用適配（Expo）

若要上線（完整功能）：
- [ ] 付費整合（LemonSqueezy Web + RevenueCat Mobile）
- [ ] AI 生成活動（可選功能）
- [ ] 無障礙設計驗證（WCAG 2.1 AA）
- [ ] 性能優化（<3s 首屏）
- [ ] 推送通知（Expo）

---

## 部署準備

```bash
# 檢查清單
make lint             # Biome pass
make type-check       # TypeScript pass
make test            # Unit tests pass
make audit           # Npm audit pass
make check-secrets   # 無硬寫 API Key

# 推送至 staging
git push develop

# 發正式版（需要合併 PR 到 main）
make ship
```

目前：**可交付的 MVP 架構**，缺 UI 層完整度
