# FamilyPlay Changelog

## [Unreleased] — Web UI、發展評估、AI 生成（BYO key）

### 導覽與版面
- 活動詳情頁加返回鍵；全站次級頁（能力/推薦/狀態選擇/設定/付費）一致返回鍵（共用 `useGoBack`，站內 back／否則 fallback、防跳出站外與 ping-pong）。
- 首頁 `/now` 加回品牌（波波吉祥物 + FamilyPlay 站名）；收緊版面間距減少「一進來被切掉」；底部導覽瘦身。
- 推薦卡片把引擎內部評分術語轉成家長看得懂的白話（`friendlyReasons`）。

### 發展里程碑評估
- 重建 `/capabilities` 為「發展里程碑」：依五大領域（粗大/精細/語言/社交認知/情緒）列里程碑、可點選標記「會了/還沒」、樂觀更新、逐顆 pending。
- `/api/capabilities`：GET 回傳已達成能力 map；新增 `PATCH` 標記（白名單驗證）。
- 原子 RPC `set_child_capability`（JSONB 合併/刪除）消除並發覆蓋 + 缺檔自我修復；API 帶 graceful fallback。
- 修正舊版顯示英文 key 且 achieved 永遠對不上的 bug。
- 標記後真正驅動推薦引擎的 ZPD 評分。

### 活動詳情
- 顯示「會練到什麼能力/目標」（developmental_focus + zpd_targets→中文）。
- `/api/activities/[id]` UUID 驗證、`maybeSingle` 區分 DB 錯誤與 404、Sentry 上報。

### AI 客製活動生成（基礎 + 免費版 BYO key）
- `packages/ai`：實作 Gemini / Groq / OpenAI / Ollama provider（逾時、錯誤映射、原生 JSON mode），活動生成 prompt（繁中、適齡、0–3 歲窒息警語、禁醫療/連結、無個資），`parseGeneratedActivity`。
- `POST /api/ai/activity`：BYO 金鑰（用完即丟、不寫 log/DB）、限流 10/min fail-closed、伺服器端推 stageKey + ZPD（不送個資）、全程 Safety Filter、任何失敗安靜降回規則式。
- model 版本識別碼不寫死於 repo（由環境變數帶入）。
- 設定頁 BYO key UI（sessionStorage、白名單驗證 provider、寫入失敗如實回報）。
- `/now`「都看過了」接「請 AI 生一個」：依時段挑安撫/玩耍型、重入保護、未設金鑰引導去設定。
- （託管/Plus 配額計次需 service-role，待後續。）

### 首次導覽與多人家庭
- `/now` 首次三步上手提示（一次性、localStorage、顯示即標記看過，未點關閉也不重複）。
- 陪伴紀錄顯示「誰陪的」：多人家庭標出本人「你」/同戶暱稱/「家人」，單人家庭不顯示避免雜訊。
- 修正家庭成員清單把 `display_name`（RLS 僅讀自己）當顯示名而一律「Unknown User」：改以 `household_members.nickname` 為主、本人加註「（你）」；`HouseholdMember` 型別集中於 store。
- 交接小卡 `/handoff`：把孩子近況（現在階段、最近三次陪玩含誰陪的、接下來在發展中的里程碑）濃縮成一張可分享的卡，給接手的家人快速進入狀況。唯讀、用既有 API 即時組（不寫 `handoff_summaries`、不送 AI）；分享優先 `navigator.share`、退回剪貼簿；使用者取消分享不偷偷複製；非 2xx 顯示載入失敗+重試；stageKey 過白名單。

### 發展里程碑（續）
- 里程碑頁顯示「接下來正在發展中」（依已勾選用 `getZpdTargets` 推出 ZPD 下一步，連到 `/now`）。
- 能力狀態型別硬化：`achieved`、`toggle`、`pending` 等狀態與函式套用 `CapabilityProfile`／`CapabilityKey` 強型別，從白名單推導以避免不安全的型別斷言（unsafe cast）。

### 待手動套用 migration
- `supabase/migrations/20260619100000_set_child_capability_rpc.sql`

## [0.1.0] - 2026-06-16 (MVP Release)

### Sprints 1-4: Core Infrastructure Complete

#### Sprint 1 - Foundation
- Supabase PostgreSQL database with 12 tables
- Row-Level Security (RLS) on all sensitive tables
- Local development environment (Docker Compose)
- Sentry error tracking + PostHog analytics
- TypeScript + Biome linting setup

#### Sprint 2 - Recommendation Engine
- 7-step algorithm implementation
- 1000+ curated activities
- 50+ capabilities across 5 categories
- 9 developmental stages (0-60 months)
- Comprehensive unit testing
- API endpoint: POST /api/recommendations

#### Sprint 3 - Activity Management
- Child management endpoints (CRUD)
- Household multi-family support
- Role-based access control (owner, caregiver, viewer)
- Capability profile system
- 24-hour shareable invite tokens
- Child deletion with cascading cleanup

#### Sprint 4 - Activity Logging
- Activity logging API (POST /api/log)
- Log history retrieval with pagination
- Outcome tracking (completed, tried, abandoned)
- Child reaction selection
- Encrypted notes storage (Plus users)
- Permission verification (RLS + application logic)
- Integration with recommendation engine

### Documentation (Complete)
- README.md - Project overview
- docs/README.md - Detailed overview
- docs/SETUP.md - Local development guide
- docs/ARCHITECTURE.md - System design
- docs/API.md - Complete API reference
- docs/FEATURES.md - Feature walkthrough
- docs/ACCESSIBILITY.md - WCAG compliance
- CLAUDE.md - Development rules
- CHANGELOG.md - Version history

### Status: MVP Ready
- **Recommendation Engine:** ✅ Complete (100% functional)
- **API Infrastructure:** ✅ Complete (20+ endpoints)
- **Database Schema:** ✅ Complete (RLS enforcement)
- **Authentication:** ✅ Complete (OAuth + email/password)
- **Logging System:** ✅ Complete (encrypted notes, permissions)
- **Testing:** ✅ Complete (unit, integration, RLS verification)
- **Documentation:** ✅ Complete (comprehensive)

---

### What's Pending (Post-MVP)

**UI Implementation:**
- Web forms and pages (Next.js)
- Mobile screens (Expo)
- Payment checkout flows
- AI generation interface

**Features:**
- Push notifications
- Offline support
- AI custom activity generation
- Handoff summaries
- Advanced analytics

**Deployment:**
- App Store releases
- Localization (EN, ES, etc)
- Performance optimization

---

## Roadmap

### Sprint 5-6: UI Completion (Q3)
- Email/password auth UI
- Google OAuth flow
- Child creation form
- Recommendation display
- Activity logging UI
- History timeline

### Sprint 7-8: Mobile Enhancement (Q3)
- Expo Router navigation
- Native push notifications
- Camera integration
- Offline support

### Sprint 9-10: AI & Advanced (Q4)
- Custom activity generation (Plus)
- Conversation-based recommendations
- Handoff summaries
- Capability auto-assessment

### Sprint 11+: Scale & Launch (Q4+)
- Payment integration
- Performance optimization
- Accessibility audit
- Localization
- App Store releases

---

## Metrics

- **API Endpoints:** 20+
- **Database Tables:** 12 (all with RLS)
- **Activities:** 1000+
- **Capabilities:** 50+ across 5 categories
- **Developmental Stages:** 9
- **Documentation Files:** 10+
- **Code Coverage:** 95%+ critical paths

---

## Key Achievements

✅ Deterministic, auditable recommendation engine
✅ Privacy-first with RLS on all tables
✅ Comprehensive API with input validation
✅ Role-based access control
✅ Encrypted sensitive data
✅ Complete documentation for developers
✅ Ready for beta testing of core features

---

See docs/FEATURES.md for feature completion matrix.
