-- ============================================================================
-- Seed: 擴充陪伴活動庫（companion_activities）
-- ----------------------------------------------------------------------------
-- 背景：正式環境原本只有 6 筆活動，推薦引擎在 9 個發展階段上嚴重缺料。
-- 本 migration 新增 29 筆（每個發展階段 3 筆 + 2 筆保底），全部對齊既有
-- schema 與 CHECK 約束：
--   stimulation_level ∈ (low, medium, high)
--   play_type         ∈ (solitary, parallel, associative, cooperative)
--   companion_type    ∈ (play, talk, read, outdoor, creative, sensory, music, calm_down)
--   space_requirement ∈ (anywhere, living_room, bedroom, outdoor, kitchen)  ← 對齊 API zod enum
--   capability keys    使用 packages/core capability-keys.ts 的 camelCase 值
--
-- 設計原則（對應推薦引擎七步）：
--   1. 年齡安全：min/max_age_months 對齊發展階段；0–3 歲不含小零件
--   2. 情境安全：高刺激活動 is_bedtime_safe=false；安撫類 is_sick_day_safe=true
--   3. 能力匹配：required_capabilities 為「需先具備」，optional 為加分
--   4. ZPD：zpd_targets 指向「正在發展中」的下一步能力
--   5/6. 情境/排序：space_requirement、required_resources（零花費填 '{}'）
--
-- 採用「直接 INSERT ... VALUES」寫法（與既有 supabase/seed.sql 一致），
-- 讓字串字面值能正確轉型為 text[]/jsonb 欄位。migration 只會執行一次。
-- 標題與既有 6 筆正式資料皆不重複。
-- ============================================================================

INSERT INTO public.companion_activities (
  title, description, opening_line, steps, follow_up_questions, safety_notes, ending_line,
  min_age_months, max_age_months,
  required_capabilities, optional_capabilities, zpd_targets, developmental_focus,
  stimulation_level, play_type, required_resources, space_requirement,
  min_duration_minutes, max_duration_minutes,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly,
  companion_type, is_fallback, is_active
) VALUES

-- ===================== NEWBORN 0–3m =====================
('黑白臉對視', '用高對比的臉部表情吸引新生兒注視，建立眼神連結。', '寶寶，看著我，我是把拔/馬麻～',
 '["把寶寶抱在離臉約 25 公分處","慢慢張大眼睛、嘟嘴、微笑","等寶寶盯著你 3 秒","換另一個表情再來一次"]',
 '["寶寶比較喜歡哪個表情？","他盯著你看多久？"]', '抱穩寶寶頭頸，避免劇烈搖晃。', '我們明天再來看看彼此的臉。',
 0, 3, '{}', '{}', '{"respondsToName"}', '{"social_cognitive","language"}',
 'low', 'solitary', '{}', 'anywhere', 3, 8, TRUE, TRUE, TRUE, 'play', FALSE, TRUE),

('趴趴抬頭', '清醒時的趴姿練習（tummy time），強化頸背肌肉。', '我們來趴一下下，練習抬頭！',
 '["在清醒且有人看顧時，讓寶寶趴在平面上","在前方放你的臉或玩具","用聲音鼓勵他抬頭","趴 1–2 分鐘，累了就翻回來"]',
 NULL, '只在清醒且全程看顧下進行，餵奶後勿立即趴。吐奶或哭鬧就停止。', '辛苦了，我們翻回來抱抱。',
 0, 4, '{}', '{}', '{"canRoll"}', '{"gross_motor"}',
 'low', 'solitary', '{}', 'anywhere', 2, 5, FALSE, TRUE, TRUE, 'play', FALSE, TRUE),

('輕唱搖籃曲', '用穩定的聲音與輕搖安撫，幫助情緒調節與入睡。', '噓～聽把拔/馬麻唱歌，慢慢放鬆。',
 '["把寶寶抱在胸前","用低而穩的聲音哼一首歌","配合呼吸輕輕搖","感覺他放鬆就漸漸放慢"]',
 NULL, '搖動要輕柔，支撐好頭頸。', '晚安，做個好夢。',
 0, 6, '{}', '{}', '{"selfSoothing"}', '{"emotional"}',
 'low', 'solitary', '{}', 'anywhere', 3, 10, TRUE, TRUE, TRUE, 'calm_down', FALSE, TRUE),

-- ===================== EARLY_INFANT 3–6m =====================
('抓抓彩色巾', '吸引寶寶伸手抓握，練習手眼協調。', '看～這條彩色巾，抓得到嗎？',
 '["拿一條柔軟方巾在寶寶胸前晃","等他伸手","讓他抓到並拉一拉","換不同顏色再試"]',
 '["他用哪隻手抓？","抓到時的表情是？"]', '布巾勿覆蓋口鼻，全程看顧。', '抓得真好，我們收起來。',
 3, 7, '{}', '{"canGrasp"}', '{"canGrasp","canRoll"}', '{"fine_motor","gross_motor"}',
 'low', 'solitary', '{}', 'anywhere', 3, 10, TRUE, TRUE, TRUE, 'sensory', FALSE, TRUE),

('翻身小幫手', '協助寶寶體驗翻身的動作軌跡。', '我們來翻個身，骨碌～',
 '["寶寶仰躺，在一側放玩具吸引","輕扶他的臀部與肩膀引導","協助翻到側躺再到趴","換另一邊再來"]',
 NULL, '動作放慢，不強拉手臂。', '翻身越來越厲害了！',
 3, 7, '{}', '{"canRoll"}', '{"canRoll"}', '{"gross_motor"}',
 'medium', 'solitary', '{}', 'anywhere', 3, 8, FALSE, TRUE, TRUE, 'play', FALSE, TRUE),

('回應名字', '叫名字並等待回應，建立聽覺與社交連結。', '（寶寶的名字）～我在這裡！',
 '["在寶寶不同方向輕喚名字","等他轉頭找聲音","對上眼就微笑回應","重複 3–4 次"]',
 '["他比較會往哪邊轉？"]', NULL, '你聽得到馬麻/把拔，真棒。',
 4, 9, '{}', '{"respondsToName"}', '{"respondsToName","meaningfulBabble"}', '{"language","social_cognitive"}',
 'low', 'parallel', '{}', 'anywhere', 3, 8, TRUE, TRUE, TRUE, 'talk', FALSE, TRUE),

-- ===================== SITTING_BABY 6–9m =====================
('坐穩敲敲樂', '坐姿下敲打安全物件，練習坐穩與因果概念。', '我們坐好，來敲敲看會發出什麼聲音！',
 '["讓寶寶坐穩（必要時用枕頭護背）","給他一個安全的杯子與湯匙","示範敲一敲發出聲音","讓他自己試"]',
 NULL, '物件需大於寶寶口腔、無小零件，避免吞食。', '叮叮咚咚，好好玩！',
 6, 10, '{"canSitUnsupported"}', '{"canPincerGrip"}', '{"canPincerGrip"}', '{"fine_motor"}',
 'medium', 'solitary', '{}', 'anywhere', 5, 12, FALSE, TRUE, TRUE, 'sensory', FALSE, TRUE),

('杯子不見了', '用杯子蓋住玩具，培養物體恆存概念。', '小車車躲起來囉，找得到嗎？',
 '["在寶寶面前放一個玩具","用杯子蓋住它","問「車車在哪裡？」","掀開說「在這裡！」"]',
 '["他會去掀杯子嗎？"]', '杯口無銳邊。', '原來躲在這裡呀！',
 6, 12, '{"canSitUnsupported"}', '{"objectPermanence"}', '{"objectPermanence"}', '{"social_cognitive"}',
 'low', 'parallel', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, 'play', FALSE, TRUE),

('咿咿呀呀對話', '模仿寶寶的牙牙語，建立輪流發聲。', '咿～呀～換你說說看！',
 '["寶寶發出聲音時，你模仿同樣的音","停頓，等他再發聲","你再回應一次","像在對話一樣輪流"]',
 '["他最常發哪個音？"]', NULL, '你好會說話，我們聊得真開心。',
 6, 12, '{}', '{"meaningfulBabble"}', '{"meaningfulBabble","hasVocabulary10"}', '{"language"}',
 'low', 'parallel', '{}', 'anywhere', 3, 10, TRUE, TRUE, TRUE, 'talk', FALSE, TRUE),

-- ===================== CRAWLER 9–12m =====================
('爬向小目標', '在前方放目標物，鼓勵爬行探索。', '玩具在那邊，我們爬過去拿！',
 '["在寶寶前方一小段距離放玩具","拍拍地板吸引他","他爬近就把玩具再移遠一點點","拿到時大大稱讚"]',
 NULL, '地面淨空、無尖角，鋪軟墊更安全。', '你爬得好快，追到了！',
 9, 14, '{"canCrawl"}', '{"canPullToStand"}', '{"canPullToStand"}', '{"gross_motor"}',
 'high', 'parallel', '{}', 'living_room', 5, 15, FALSE, FALSE, FALSE, 'play', FALSE, TRUE),

('夾夾小點心', '用拇指食指夾取小食物，練習鉗形抓握。', '來，用小手指夾起來吃！',
 '["把寶寶能吃的小塊食物放在餐盤","示範用拇指食指夾起","讓他自己夾","夾到就鼓勵"]',
 '["他比較會用哪隻手？"]', '全程看顧避免嗆咳，食物切到適口大小、軟硬適中。', '小手指越來越靈巧了。',
 9, 14, '{"canSitUnsupported"}', '{"canPincerGrip"}', '{"canPincerGrip"}', '{"fine_motor"}',
 'low', 'solitary', '{}', 'anywhere', 5, 12, FALSE, TRUE, TRUE, 'sensory', FALSE, TRUE),

('揮手再見', '模仿揮手等社交動作，建立模仿與互動。', '揮揮手，跟玩具說再見～',
 '["示範揮手說「掰掰」","握著寶寶的手一起揮","對著玩偶練習","他自己揮就歡呼"]',
 NULL, NULL, '掰掰，下次再玩！',
 9, 15, '{}', '{"imitatesActions"}', '{"imitatesActions","canTakeTurns"}', '{"social_cognitive"}',
 'low', 'parallel', '{}', 'anywhere', 3, 8, TRUE, TRUE, TRUE, 'play', FALSE, TRUE),

-- ===================== EARLY_WALKER 12–18m =====================
('推著走走', '推穩固的箱子或學步車練習走路。', '我們推著它，一起走走看！',
 '["找一個夠重、不會滑的箱子或推車","讓孩子扶著推","在旁邊保護","走到目標點歡呼"]',
 NULL, '地面防滑、清空障礙，全程在旁保護避免跌撞。', '你走得好穩！',
 12, 18, '{"canPullToStand"}', '{"canWalkIndependently"}', '{"canWalkIndependently"}', '{"gross_motor"}',
 'high', 'solitary', '{}', 'living_room', 5, 15, FALSE, FALSE, FALSE, 'play', FALSE, TRUE),

('疊疊小高塔', '疊積木練習手部控制與因果。', '我們來疊高高，看會不會倒！',
 '["拿 3–4 塊大積木","示範疊起來","讓孩子試著疊","倒了就一起笑著再來"]',
 '["他疊到第幾塊？","倒下來他的反應是？"]', '使用大塊積木，避免小零件。', '疊得好高，厲害！',
 12, 24, '{"canGrasp"}', '{"canStackBlocks3"}', '{"canStackBlocks3"}', '{"fine_motor"}',
 'medium', 'solitary', '{"blocks"}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, 'play', FALSE, TRUE),

('指認身體部位', '邊唱邊指，連結語彙與身體認識。', '鼻子在哪裡？我們一起找！',
 '["問「鼻子在哪裡？」","握著孩子的手指自己的鼻子","換眼睛、嘴巴、耳朵","最後讓他自己指"]',
 '["他最先學會指哪裡？"]', NULL, '你認識好多身體部位了！',
 12, 24, '{}', '{"hasVocabulary10"}', '{"hasVocabulary10","usesTwoWordPhrases"}', '{"language","social_cognitive"}',
 'low', 'parallel', '{}', 'anywhere', 3, 10, TRUE, TRUE, TRUE, 'talk', FALSE, TRUE),

-- ===================== TODDLER_TALKER 18–24m =====================
('抱枕跳跳島', '在抱枕間移動，練習跑跳與平衡。', '這裡是小島，我們跳過去！',
 '["在地上排幾個抱枕當小島","示範踩上去說「跳」","讓孩子跟著踩","加「砰砰」音效"]',
 NULL, '地面鋪軟墊、清空硬物，在旁保護。', '你跳得好棒，靠岸啦！',
 18, 36, '{"canWalkIndependently"}', '{"canRun","canJumpBothFeet"}', '{"canRun","canJumpBothFeet"}', '{"gross_motor"}',
 'high', 'parallel', '{"cushions"}', 'living_room', 10, 20, FALSE, FALSE, FALSE, 'play', FALSE, TRUE),

('你一個我一個', '輪流放積木，練習輪流與合作雛形。', '換你放一個，再換我，好嗎？',
 '["準備一堆積木","你放一個說「換你」","等孩子放","輪流直到疊完或排成一排"]',
 '["他願意等待輪流嗎？"]', NULL, '我們一起完成了！',
 18, 30, '{"imitatesActions"}', '{"canTakeTurns"}', '{"canTakeTurns","cooperativePlay"}', '{"social_cognitive","emotional"}',
 'medium', 'associative', '{"blocks"}', 'anywhere', 8, 15, TRUE, TRUE, TRUE, 'play', FALSE, TRUE),

('餵娃娃吃飯', '假扮餵食，啟動象徵性遊戲。', '娃娃肚子餓了，我們餵牠吃飯！',
 '["拿玩偶與空碗湯匙","示範「餵」娃娃","問「娃娃飽了嗎？」","讓孩子自己餵"]',
 '["他會幫娃娃做什麼？"]', NULL, '娃娃吃飽飽，謝謝你照顧牠。',
 18, 36, '{"imitatesActions"}', '{"symbolicPlay","usesTwoWordPhrases"}', '{"symbolicPlay"}', '{"social_cognitive","language"}',
 'low', 'solitary', '{}', 'anywhere', 8, 20, TRUE, TRUE, TRUE, 'creative', FALSE, TRUE),

-- ===================== TODDLER_PLAYER 24–36m =====================
('雙腳跳格子', '在地上跳格子，練習雙腳跳與控制。', '我們來跳格子，準備好了嗎？',
 '["用膠帶在地上貼幾個格子","示範雙腳跳進格子","讓孩子跟著跳","數「一格、兩格」"]',
 NULL, '地面防滑、在旁保護避免跌倒。', '你跳完全部格子了，太強了！',
 24, 42, '{"canWalkIndependently"}', '{"canJumpBothFeet"}', '{"canJumpBothFeet","canHopOneFoot"}', '{"gross_motor"}',
 'high', 'parallel', '{}', 'living_room', 8, 20, FALSE, FALSE, FALSE, 'play', FALSE, TRUE),

('塗鴉說故事', '自由塗鴉並描述畫了什麼，連結手部與語言。', '我們來畫畫，你想畫什麼？',
 '["鋪紙、給粗蠟筆","讓孩子自由塗鴉","問「這是什麼呀？」","把他說的寫在旁邊"]',
 '["他幫他的畫取了什麼名字？"]', '使用無毒粗蠟筆，避免放入口中。', '這幅畫好有故事，我們貼起來。',
 24, 48, '{"canGrasp"}', '{"canScribble","usesSentences"}', '{"canDrawCircle","usesSentences"}', '{"fine_motor","language"}',
 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 8, 20, TRUE, TRUE, TRUE, 'creative', FALSE, TRUE),

('深呼吸吹泡泡', '用想像吹泡泡的方式練習情緒平復。', '我們一起慢慢吹一個大泡泡，呼～',
 '["坐下面對孩子","示範深吸氣，再慢慢吹氣","想像吹出一個大泡泡","重複 3 次直到平靜"]',
 NULL, NULL, '你的身體放鬆下來了，好棒。',
 24, 60, '{}', '{"toleratesFrustration"}', '{"toleratesFrustration","selfSoothing"}', '{"emotional"}',
 'low', 'parallel', '{}', 'anywhere', 3, 10, TRUE, TRUE, TRUE, 'calm_down', FALSE, TRUE),

-- ===================== PRESCHOOLER 36–48m =====================
('單腳金雞獨立', '練習單腳站與單腳跳，挑戰平衡。', '看誰能像金雞一樣單腳站最久！',
 '["示範單腳站，數秒數","讓孩子試著單腳站","再挑戰單腳跳一下","比比看誰站比較久"]',
 '["他可以單腳站幾秒？"]', '在軟墊或空曠處，旁邊保護。', '你的平衡感越來越好了！',
 36, 54, '{"canRun"}', '{"canHopOneFoot"}', '{"canHopOneFoot"}', '{"gross_motor"}',
 'medium', 'cooperative', '{}', 'anywhere', 5, 15, FALSE, TRUE, FALSE, 'play', FALSE, TRUE),

('剪貼小作品', '用安全剪刀剪貼，練習雙手協調。', '我們來剪剪貼貼，做一張小卡片！',
 '["準備兒童安全剪刀、紙、膠水","示範剪直線","讓孩子剪下形狀","貼到底紙上完成作品"]',
 '["他想把作品送給誰？"]', '使用兒童安全剪刀，全程看顧。', '這張卡片好特別，你做到了！',
 36, 60, '{"canScribble"}', '{"canUseScissors"}', '{"canUseScissors","canWriteName"}', '{"fine_motor"}',
 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 10, 20, TRUE, TRUE, TRUE, 'creative', FALSE, TRUE),

('今天發生什麼事', '引導孩子描述一天，練習完整敘事。', '跟我說說，你今天做了哪些事？',
 '["坐下來面對孩子","問「今天最好玩的是什麼？」","追問「然後呢？」","用「哇／真的嗎」回應"]',
 '["今天有沒有讓你不開心的事？"]', NULL, '謝謝你跟我分享，我很喜歡聽。',
 36, 60, '{"usesSentences"}', '{"canDescribeEvents"}', '{"canDescribeEvents","canHaveConversation"}', '{"language","social_cognitive"}',
 'low', 'parallel', '{}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, 'talk', FALSE, TRUE),

-- ===================== PRESCHOOLER_PLUS 48–60m =====================
('寫寫我的名字', '描寫或仿寫名字，銜接書寫前技能。', '我們來寫你的名字，你來當小作家！',
 '["把孩子的名字寫成淡淡的範字","讓他沿著描","再試著自己仿寫","完成就貼在牆上展示"]',
 '["你最喜歡名字裡哪個字？"]', '使用粗握筆，姿勢輕鬆不強求工整。', '這是你親手寫的名字，真棒！',
 48, 60, '{"canScribble"}', '{"canWriteName"}', '{"canWriteName"}', '{"fine_motor","language"}',
 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 8, 20, TRUE, TRUE, TRUE, 'creative', FALSE, TRUE),

('我們訂規則玩', '玩有簡單規則的小遊戲，練習遵守規則。', '我們來玩一二三木頭人，要守規則喔！',
 '["說明規則：喊停就不能動","你當鬼，孩子前進","喊「木頭人」大家定格","換孩子當鬼再玩"]',
 '["守規則會不會很難？"]', '在空曠處避免碰撞。', '你今天好會守規則，玩得真開心！',
 48, 60, '{"canRun"}', '{"canFollowRules","canTakeTurns"}', '{"canFollowRules","cooperativePlay"}', '{"social_cognitive","emotional"}',
 'high', 'cooperative', '{}', 'living_room', 10, 20, FALSE, TRUE, FALSE, 'play', FALSE, TRUE),

('一來一往聊天', '進行有來有回的對話，練習傾聽與表達。', '我問你答，你也可以問我喔！',
 '["選一個主題（最喜歡的動物）","你先問一個問題","認真聽他回答再追問","換他問你"]',
 '["如果你是那個動物，你想做什麼？"]', NULL, '跟你聊天好有趣，明天再聊！',
 48, 72, '{"usesSentences"}', '{"canHaveConversation"}', '{"canHaveConversation"}', '{"language","social_cognitive"}',
 'low', 'parallel', '{}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, 'talk', FALSE, TRUE),

-- ===================== 保底活動（fallback） =====================
('抱一抱充電', '不需任何道具的安撫式陪伴，任何時刻都適用。', '來，我們抱一抱，充滿電再出發。',
 '["放下手邊的事，蹲到孩子的高度","給一個溫暖的擁抱","輕拍背部，配合呼吸","待孩子準備好再放開"]',
 NULL, NULL, '抱飽了，我們一起做下一件事。',
 NULL, NULL, '{}', '{}', '{"selfSoothing"}', '{"emotional"}',
 'low', NULL, '{}', 'anywhere', 2, 10, TRUE, TRUE, TRUE, 'calm_down', TRUE, TRUE),

('一起看窗外', '觀察窗外並描述所見，零準備的輕陪伴。', '我們來看看窗外有什麼？',
 '["一起走到窗邊","輪流說出看到的東西","數一數有幾台車／幾隻鳥","猜猜外面在發生什麼"]',
 '["你最想出去做什麼？"]', NULL, '外面好多有趣的事，下次出去看！',
 NULL, NULL, '{}', '{}', '{"canDescribeEvents"}', '{"language","social_cognitive"}',
 'low', 'parallel', '{}', 'anywhere', 3, 15, TRUE, TRUE, TRUE, 'talk', TRUE, TRUE);
