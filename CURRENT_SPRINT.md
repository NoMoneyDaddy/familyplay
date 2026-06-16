# Sprint 2 — 核心推薦邏輯

**目標：** 七步推薦引擎 + API + 核心測試

**狀態：** ✅ 完成

---

## 任務清單

### 推薦引擎核心（packages/core）
- [x] Stage keys (9 階段，0–60 個月)
- [x] Capability keys（42 個發展能力跨 5 域）
- [x] Safety rules（禁止材料 + 情境阻擋規則）
- [x] Recommendation engine（7 步演算法）
  - [x] Step 1: Age safety filter
  - [x] Step 2: Context safety rules
  - [x] Step 3: Capability matching
  - [x] Step 4: ZPD scoring
  - [x] Step 5: Context/resource filtering
  - [x] Step 6: Priority sorting
  - [x] Step 7: Recency penalty
- [x] Vitest 覆蓋率（18 tests pass）

### API Endpoint
- [x] POST /api/recommendations（輸入: childId、parentEnergy、context、space、resources、maxDuration）
- [x] Fetch from Supabase（活動、能力、近期紀錄）
- [x] 年齡計算（birth_year_month → ageMonths）
- [x] 返回前 3 筆推薦（含 score + reasons）

### 測試基礎
- [x] Core + AI + Assessment 各自獨立測試
- [x] Mobile + Web 測試分離（避免衝突）
- [x] 全部 unit tests 通過

---

## 驗收標準

```bash
pnpm test                                    # ✅ Core + AI + Assessment 通過
pnpm --filter @familyplay/web type-check   # ✅ 無 TS 錯誤
pnpm biome check .                           # ✅ 無 lint 錯誤
POST /api/recommendations                   # ✅ 返回 3 筆推薦，含 score
```

---

## 下一個 Sprint

Sprint 3 — 認證流程 + 選擇流程
- Supabase Auth 完整實現（登入、Google OAuth、session）
- 首頁狀態選擇（parentEnergy、context 選擇器）
- 推薦結果頁面（顯示 3 筆活動，可開始/記錄）
- Activity 詳細頁面
- 孩子管理介面
- Vitest > 90% 覆蓋率
