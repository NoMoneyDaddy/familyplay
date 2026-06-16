-- FamilyPlay Seed Data
-- 示範孩子 + 前 5 筆活動模板（完整能力標籤）

-- ─────────────────────────────────────────────────────────
-- 保底活動（永遠適用）
-- ─────────────────────────────────────────────────────────
INSERT INTO companion_activities (
  title, opening_line, steps, follow_up_questions, ending_line,
  stimulation_level, companion_type,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly, is_fallback, is_active
) VALUES (
  '問你一件今天的事',
  '你今天有什麼讓你開心的事嗎？',
  '["坐在孩子旁邊", "說出開口第一句", "認真聽，點頭，不評判"]',
  '["然後呢？", "那讓你感覺怎麼樣？"]',
  '謝謝你告訴我這件事。',
  'low', 'talk',
  TRUE, TRUE, TRUE, TRUE, TRUE
);

-- ─────────────────────────────────────────────────────────
-- 活動模板（前 5 筆，含完整能力標籤）
-- ─────────────────────────────────────────────────────────

INSERT INTO companion_activities (
  title, opening_line,
  steps, follow_up_questions, safety_notes, ending_line,
  min_age_months, max_age_months,
  required_capabilities, optional_capabilities, zpd_targets,
  developmental_focus, stimulation_level, play_type,
  required_resources, space_requirement,
  min_duration_minutes, max_duration_minutes,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly, is_active
) VALUES

-- 1. 躺著踢踢腿
(
  '躺著踢踢腿',
  '我們來動動小腳吧！',
  '["把寶寶放在安全平面上", "輕輕握住腳踝", "帶動腳做腳踏車動作", "說「踢踢左腳、踢踢右腳」"]',
  '["你看到寶寶有反應了嗎？", "他喜歡哪個方向？"]',
  '全程保持手輕柔，不要拉扯關節',
  '做得好！寶寶喜歡和你在一起。',
  0, 6,
  '{}',
  '{"canRoll"}',
  '{"canRoll"}',
  '{"gross_motor"}', 'low', 'solitary',
  '{}', 'anywhere',
  5, 10,
  TRUE, TRUE, TRUE, TRUE
),

-- 2. 藏貓貓
(
  '藏貓貓（物體恆存）',
  '寶寶，我在哪裡？',
  '["用雙手遮住臉", "說「不見了」", "打開手說「我在這裡！」", "觀察寶寶是否找你"]',
  '["寶寶有笑嗎？", "你試試遮住玩具看他找不找"]',
  NULL,
  '你們笑了，這就是今天最好的陪伴。',
  6, 18,
  '{}',
  '{"objectPermanence"}',
  '{"objectPermanence", "imitatesActions"}',
  '{"social_cognitive", "language"}', 'low', 'parallel',
  '{}', 'anywhere',
  5, 15,
  TRUE, TRUE, TRUE, TRUE
),

-- 3. 抱枕島探險
(
  '抱枕島探險',
  '這裡是小島，我們要跳過去！',
  '["在地板上放幾個抱枕", "示範踩上去說「跳！」", "讓孩子跟著踩", "加聲音效果「砰砰砰」"]',
  '["哪個島最難跳？", "我們可以做什麼規則？"]',
  '抱枕要穩，地板沒有障礙物',
  '探險家完成任務，太厲害了！',
  12, 48,
  '{"canWalkIndependently"}',
  '{"canRun", "canJumpBothFeet"}',
  '{"canJumpBothFeet"}',
  '{"gross_motor"}', 'high', 'parallel',
  '{"cushions"}', 'living_room',
  10, 20,
  FALSE, FALSE, FALSE, TRUE
),

-- 4. 睡前三頁書
(
  '睡前三頁書',
  '我們來看三頁書，然後睡覺。',
  '["拿一本圖畫書", "讓孩子選「從哪頁開始」", "唸三頁（不多不少）", "說「今天就到這裡，明天繼續」"]',
  '["這頁你喜歡哪個角色？", "你猜下一頁會發生什麼？"]',
  NULL,
  '今天看了三頁，很好。明天繼續。',
  12, 72,
  '{}',
  '{"hasVocabulary10", "usesTwoWordPhrases"}',
  '{"canDescribeEvents"}',
  '{"language", "social_cognitive"}', 'low', 'parallel',
  '{"books"}', 'bedroom',
  10, 15,
  TRUE, TRUE, TRUE, TRUE
),

-- 5. 模仿動作遊戲
(
  '我做你跟著做',
  '看我做，你也做一樣的！',
  '["示範一個簡單動作（拍手）", "說「換你了」", "換孩子示範", "輪流各做 3 次"]',
  '["你還會做什麼動作？", "可以越來越快嗎？"]',
  NULL,
  '你們輪流做到了，這就是合作！',
  8, 48,
  '{"imitatesActions"}',
  '{"canTakeTurns"}',
  '{"canTakeTurns", "symbolicPlay"}',
  '{"social_cognitive", "gross_motor"}', 'medium', 'associative',
  '{}', 'anywhere',
  10, 20,
  FALSE, TRUE, TRUE, TRUE
);
