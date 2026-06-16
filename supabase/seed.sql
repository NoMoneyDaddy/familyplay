-- FamilyPlay Seed Data - 53 Activities (0-60 months)

-- Fallback Activity (always safe)
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

-- Activities grouped by age/theme (48 more activities...)
-- Newborn 0-3 months (3 activities)
-- Early infant 3-6 months (4 activities) 
-- Sitting baby 6-9 months (4 activities)
-- Crawler 9-12 months (4 activities)
-- Early walker 12-18 months (5 activities)
-- Toddler talker 18-24 months (5 activities)
-- Toddler player 24-36 months (5 activities)
-- Preschooler 36-48 months (5 activities)
-- Preschooler plus 48-60 months (5 activities)
-- Resource-specific (5 activities)
-- Emotional/special situations (5 activities)

INSERT INTO companion_activities (
  title, description, opening_line, steps, follow_up_questions, ending_line,
  min_age_months, max_age_months,
  required_capabilities, optional_capabilities, zpd_targets,
  developmental_focus, stimulation_level, play_type,
  required_resources, space_requirement,
  min_duration_minutes, max_duration_minutes,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly, is_active
) VALUES
('黑白卡片追蹤', '新生兒對高對比的黑白圖案特別敏感。', '看看寶寶能不能跟著卡片走？', '["製作或拿出高對比黑白卡片", "將卡片放在寶寶面前15-20公分", "慢慢左右移動卡片", "觀察寶寶眼睛是否跟蹤"]', '["寶寶有看著卡片嗎？", "他能跟蹤多遠？"]', '寶寶的眼睛一直在發展，你做得很好。', 0, 3, '{}', '{}', '{}', '{"social_cognitive"}', 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 3, 8, TRUE, TRUE, TRUE, TRUE),
('輕柔搖籃曲', '用溫暖的聲音和簡單的曲調安撫新生兒。', '讓我們唱一首輕輕的歌吧。', '["找一個舒適的位置抱住寶寶", "選一首簡單的搖籃曲", "用輕柔的聲調緩慢唱歌", "可以輕輕搖晃，配合歌聲"]', '["寶寶有平靜下來嗎？", "他最喜歡哪一首歌？"]', '你的聲音就是寶寶最好的音樂。', 0, 3, '{}', '{}', '{}', '{"language","emotional"}', 'low', 'solitary', '{}', 'anywhere', 5, 12, TRUE, TRUE, TRUE, TRUE),
('輕輕撫摸小手', '溫柔的觸覺刺激有助於寶寶的感覺發展。', '讓媽媽摸摸你的小手。', '["輕輕打開寶寶的小手", "用手指輕輕畫圓或線", "按摩每個小手指", "觀察寶寶的反應"]', '["寶寶握緊你的手指了嗎？", "他喜歡哪個部位被摸？"]', '寶寶的小手就是你最喜歡的禮物。', 0, 3, '{}', '{"canGrasp"}', '{"canGrasp"}', '{"fine_motor","emotional"}', 'low', 'solitary', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('躺著踢踢腿', '新生兒還不會主動踢腿時，爸媽可以帶動。', '我們來動動小腳吧！', '["把寶寶放在安全平面上", "輕輕握住腳踝", "帶動腳做腳踏車動作", "說「踢踢左腳、踢踢右腳」"]', '["你看到寶寶有反應了嗎？", "他喜歡哪個方向？"]', '做得好！寶寶喜歡和你在一起。', 0, 6, '{}', '{"canRoll"}', '{"canRoll"}', '{"gross_motor"}', 'low', 'solitary', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('聲音追蹤遊戲', '寶寶會開始尋找聲音的來源。', '寶寶，你聽！', '["在寶寶的一側發出聲音（搖鈴或簡單的「哈囉」）", "觀察寶寶是否轉頭尋找", "換到另一側", "重複 3-5 次"]', '["寶寶轉頭尋找聲音了嗎？", "他最喜歡什麼樣的聲音？"]', '你的聲音引導著寶寶探索世界。', 3, 6, '{}', '{"respondsToName"}', '{"respondsToName"}', '{"language","social_cognitive"}', 'low', 'solitary', '{"music"}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('鏡子遊戲', '3-4 個月的寶寶開始社交微笑。', '看看鏡子裡有誰？', '["拿著寶寶或帶他靠近安全的鏡子", "在鏡子前做好笑的表情", "指著鏡子裡的「寶寶」", "看寶寶有沒有反應"]', '["寶寶有笑嗎？", "他在看鏡子裡的自己嗎？"]', '寶寶看著自己的樣子，現在他認識了自己。', 3, 6, '{}', '{}', '{}', '{"social_cognitive"}', 'low', 'solitary', '{}', 'bathroom', 5, 10, TRUE, TRUE, FALSE, TRUE),
('手指點點點', '這個簡單的韻律遊戲讓寶寶習慣你的聲音。', '我們來玩點點點！', '["把寶寶放在面前或抱著", "一邊唱「一根手指點點點、點點點」一邊點寶寶的身體", "重複幾次，換不同部位", "看寶寶有沒有被逗笑"]', '["寶寶有大笑嗎？", "他喜歡被點哪個部位？"]', '寶寶咯咯笑的聲音是你最棒的獎勵。', 3, 6, '{}', '{}', '{}', '{"language","social_cognitive"}', 'low', 'solitary', '{}', 'anywhere', 3, 8, TRUE, TRUE, TRUE, TRUE),
('藏貓貓（物體恆存）', '6 個月的寶寶開始理解東西消失後會回來。', '寶寶，我在哪裡？', '["用雙手遮住臉", "說「不見了」", "打開手說「我在這裡！」", "觀察寶寶是否找你"]', '["寶寶有笑嗎？", "你試試遮住玩具看他找不找"]', '你們笑了，這就是今天最好的陪伴。', 6, 18, '{}', '{"objectPermanence"}', '{"objectPermanence","imitatesActions"}', '{"social_cognitive","language"}', 'low', 'parallel', '{}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, TRUE),
('傳遞玩具遊戲', '寶寶開始想要抓取和傳遞東西。', '給我一個！', '["坐在寶寶面前", "把玩具放在他面前", "等他拿起來", "說「謝謝！」並接過", "把它還給他，重複"]', '["寶寶拿住了嗎？", "他願意給你東西嗎？"]', '寶寶在學會分享，這很重要。', 6, 9, '{"canGrasp"}', '{"canPincerGrip"}', '{"canPincerGrip"}', '{"fine_motor","social_cognitive"}', 'low', 'associative', '{"blocks"}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('敲敲打打', '6-9 個月的寶寶發現物品會發出聲音。', '聽聽這個聲音！', '["用空容器、鍋蓋或木湯匙", "示範輕輕敲打容器", "讓寶寶握著湯匙試試", "隨著節奏唱歌或拍手"]', '["寶寶有敲打嗎？", "他最喜歡什麼聲音？"]', '寶寶正在發現音樂的奧秘。', 6, 9, '{"canGrasp"}', '{"canSitUnsupported"}', '{}', '{"fine_motor","language"}', 'medium', 'solitary', '{"kitchen_items"}', 'kitchen', 5, 10, FALSE, TRUE, TRUE, TRUE),
('扶站練習', '寶寶開始用你的手來幫助站起。', '我們站起來看看！', '["寶寶坐著的時候", "伸出你的食指讓他握住", "慢慢往上拉，幫助他站起", "說「站起來啦」，然後輕輕放下"]', '["寶寶能用力抓住你嗎？", "他站了多久？"]', '寶寶正在準備走路，做得很好。', 6, 9, '{"canSitUnsupported"}', '{"canPullToStand"}', '{"canPullToStand"}', '{"gross_motor"}', 'low', 'solitary', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('爬行競賽', '寶寶在這個階段最喜歡到處爬。', '來爬到媽媽這裡！', '["清空地板上的障礙物", "坐在一個安全的距離", "用開心的聲音叫他", "敞開雙臂迎接他"]', '["寶寶爬得快嗎？", "他喜歡向什麼方向爬？"]', '寶寶爬得真快，他很快就會走路了。', 9, 12, '{"canCrawl"}', '{"canWalkIndependently"}', '{"canWalkIndependently"}', '{"gross_motor"}', 'medium', 'parallel', '{}', 'living_room', 5, 15, FALSE, TRUE, TRUE, TRUE),
('我做你跟著做', '寶寶開始學會模仿。', '看我做，你也做一樣的！', '["示範一個簡單動作（拍手）", "說「換你了」", "換寶寶示範", "輪流各做 3 次"]', '["寶寶有模仿嗎？", "可以越來越快嗎？"]', '你們輪流做到了，這就是合作！', 8, 48, '{"imitatesActions"}', '{"canTakeTurns"}', '{"canTakeTurns","symbolicPlay"}', '{"social_cognitive","gross_motor"}', 'medium', 'associative', '{}', 'anywhere', 10, 20, FALSE, TRUE, TRUE, TRUE),
('按鈴遊戲', '9-12 個月的寶寶開始理解因果關係。', '按一下會發出聲音喔！', '["拿一個帶按鈕的玩具或小鈴", "示範按一下", "讓寶寶試著按", "當聲音響起時，驚喜地說「哇！」"]', '["寶寶按了嗎？", "他會反覆按同一個位置嗎？"]', '寶寶理解了因果關係，他很聰明。', 9, 12, '{"canGrasp"}', '{}', '{}', '{"social_cognitive","fine_motor"}', 'low', 'solitary', '{"blocks"}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('抱枕島探險', '寶寶快走路了。用抱枕創造簡單的障礙。', '這裡是小島，我們要跳過去！', '["在地板上放幾個抱枕", "示範踩上去說「跳！」", "讓寶寶跟著踩", "加聲音效果「砰砰砰」"]', '["哪個島最難跳？", "我們可以做什麼規則？"]', '探險家完成任務，太厲害了！', 12, 48, '{"canWalkIndependently"}', '{"canRun","canJumpBothFeet"}', '{"canJumpBothFeet"}', '{"gross_motor"}', 'high', 'parallel', '{"cushions"}', 'living_room', 10, 20, FALSE, FALSE, FALSE, TRUE);

INSERT INTO companion_activities (
  title, description, opening_line, steps, follow_up_questions, ending_line,
  min_age_months, max_age_months,
  required_capabilities, optional_capabilities, zpd_targets,
  developmental_focus, stimulation_level, play_type,
  required_resources, space_requirement,
  min_duration_minutes, max_duration_minutes,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly, is_active
) VALUES
('身體部位遊戲', '幼兒開始理解詞彙與物品的關聯。', '寶寶，你的鼻子在哪裡？', '["指著自己的一個身體部位（如鼻子）", "問「這是什麼？」", "自己回答「這是媽媽的鼻子」", "然後指著寶寶說「你的鼻子呢？」", "重複 5-6 個部位"]', '["寶寶會指自己的部位嗎？", "他最先學會指哪個部位？"]', '寶寶在學習認識自己的身體。', 12, 18, '{}', '{"hasVocabulary10","respondsToName"}', '{"hasVocabulary10"}', '{"language","social_cognitive"}', 'low', 'solitary', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('室內走路冒險', '幼兒現在可以走路了。', '我們去走走看！', '["清空走道上的障礙物", "牽著孩子的手", "說「我們去看看廚房」然後走過去", "一邊走一邊指點有趣的東西"]', '["孩子走得穩嗎？", "他最想去哪個地方？"]', '孩子走得越來越穩。一步步都是進步。', 12, 18, '{"canWalkIndependently"}', '{"canRun"}', '{"canRun"}', '{"gross_motor"}', 'low', 'parallel', '{}', 'living_room', 10, 20, FALSE, TRUE, FALSE, TRUE),
('堆疊積木', '12-15 個月的孩子開始想要堆東西。', '我們來堆積木！', '["拿出大積木", "堆疊 2-3 個", "示範輕輕放上去", "讓孩子試著堆", "如果倒下了，一起再堆一次"]', '["孩子能放穩積木嗎？", "他推倒積木後會想重新堆嗎？"]', '堆積木教會孩子耐心和嘗試。', 12, 24, '{"canGrasp"}', '{"canStackBlocks3","canPincerGrip"}', '{"canStackBlocks3"}', '{"fine_motor"}', 'low', 'solitary', '{"blocks"}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, TRUE),
('跟著做 - 簡單指令', '孩子現在可以理解和執行簡單的單步指令。', '你能拍手嗎？', '["給一個簡單的指令，如「拍手」", "示範一遍", "說「現在換你，拍手」", "當他做到時，大力讚賞"]', '["孩子理解指令嗎？", "他喜歡哪種指令？"]', '孩子理解你的語言，這很棒！', 12, 24, '{}', '{"hasVocabulary10"}', '{"hasVocabulary10"}', '{"language","social_cognitive"}', 'low', 'associative', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('球的追逐', '軟球在光滑地板上滾動會吸引孩子追。', '球滾走囉，去追它！', '["在光滑的地板（如廚房瓷磚）上輕輕滾一個軟球", "孩子會本能地追", "讓他去拿回來", "大力讚賞，然後再滾一次"]', '["孩子追得快嗎？", "他會自己滾球嗎？"]', '孩子在練習走路和遊戲規則。', 12, 18, '{"canWalkIndependently"}', '{}', '{}', '{"gross_motor","social_cognitive"}', 'medium', 'parallel', '{"balls"}', 'living_room', 5, 15, FALSE, TRUE, FALSE, TRUE),
('睡前三頁書', '用故事和圖片來結束一天。', '我們來看三頁書，然後睡覺。', '["拿一本圖畫書", "讓孩子選「從哪頁開始」", "唸三頁（不多不少）", "說「今天就到這裡，明天繼續」"]', '["這頁你喜歡哪個角色？", "你猜下一頁會發生什麼？"]', '今天看了三頁，很好。明天繼續。', 12, 72, '{}', '{"hasVocabulary10","usesTwoWordPhrases"}', '{"canDescribeEvents"}', '{"language","social_cognitive"}', 'low', 'parallel', '{"books"}', 'bedroom', 10, 15, TRUE, TRUE, TRUE, TRUE),
('假扮廚房', '18-24 個月的孩子開始進入假扮遊戲時代。', '我們來煮飯囉！', '["在玩具廚房或用實際廚房用具", "示範把積木當「食材」放入鍋子", "假裝攪拌說「嗯嗯，香香」", "邀請孩子也來做"]', '["孩子會跟著假扮嗎？", "他想做什麼菜？"]', '孩子在用想像力創造故事。', 18, 36, '{}', '{"symbolicPlay","usesTwoWordPhrases"}', '{"symbolicPlay"}', '{"social_cognitive"}', 'medium', 'associative', '{"kitchen_items"}', 'kitchen', 10, 20, FALSE, TRUE, TRUE, TRUE),
('音樂舞蹈派對', '幼兒愛唱歌和跳舞。', '我們放音樂跳舞吧！', '["選一首簡短的童謠或兒歌", "示範簡單的舞步（上下跳、轉圈）", "邀請孩子跟著", "做 2-3 首歌"]', '["孩子會跟著跳嗎？", "哪首歌是他最喜歡的？"]', '你們一起跳舞，多開心啊！', 18, 36, '{}', '{"canRun","usesTwoWordPhrases"}', '{}', '{"language","gross_motor"}', 'high', 'parallel', '{"music"}', 'living_room', 5, 15, FALSE, FALSE, TRUE, TRUE),
('拿起蠟筆畫', '18 個月的孩子開始塗鴉。', '我們一起畫畫！', '["拿出大蠟筆和紙張", "示範在紙上畫線和點", "遞給孩子一支蠟筆", "鼓勵他在紙上做記號", "說出他使用的顏色"]', '["孩子畫了什麼？", "他最喜歡哪個顏色？"]', '孩子的塗鴉就是藝術作品。', 15, 24, '{}', '{"canScribble"}', '{"canScribble"}', '{"fine_motor"}', 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, TRUE),
('老鼠和貓', '18-24 個月的孩子現在可以跑得更快了。', '我來抓你！', '["在一個安全的開放空間", "說「我要來抓你了」", "慢慢地追向孩子", "讓孩子跑開（故意跑得比他慢一點）", "假裝要抓住他時，溫柔地「抓住」並大笑"]', '["孩子跑得快嗎？", "他喜歡你追他還是他追你？"]', '追逐遊戲很累，但孩子會睡得很香。', 18, 36, '{"canRun"}', '{}', '{}', '{"gross_motor"}', 'high', 'parallel', '{}', 'living_room', 10, 20, FALSE, FALSE, FALSE, TRUE);

INSERT INTO companion_activities (
  title, description, opening_line, steps, follow_up_questions, ending_line,
  min_age_months, max_age_months,
  required_capabilities, optional_capabilities, zpd_targets,
  developmental_focus, stimulation_level, play_type,
  required_resources, space_requirement,
  min_duration_minutes, max_duration_minutes,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly, is_active
) VALUES
('躲貓貓進階遊戲', '現在孩子可以理解躲藏和尋找。', '我要去躲起來，你來找我！', '["藏在一個可見的地方（如沙發後）", "說「我躲起來了，你來找我」", "如果他找不到，給個線索「我在沙發這邊」", "當他找到你時，大聲驚喜地說「你找到我了！」"]', '["孩子有找你嗎？", "他躲藏時會說「找我」嗎？"]', '孩子在學習遊戲規則和溝通。', 18, 36, '{}', '{"objectPermanence"}', '{}', '{"social_cognitive","language"}', 'medium', 'parallel', '{}', 'living_room', 10, 20, FALSE, TRUE, FALSE, TRUE),
('大片拼圖', '2-3 歲的孩子可以開始進行簡單的拼圖。', '我們來做拼圖！', '["拿出 2-4 片的大拼圖", "示範如何將一片放入正確的位置", "讓孩子試著放置其他片", "當拼圖完成時，一起看著完成品說「做好了！」"]', '["孩子能放進一片嗎？", "他會堅持完成嗎？"]', '孩子在學習解決問題。', 24, 48, '{}', '{"canPincerGrip"}', '{}', '{"fine_motor","social_cognitive"}', 'low', 'solitary', '{"blocks"}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, TRUE),
('動物聲音', '孩子現在可以學習和複述不同的動物聲音。', '狗狗怎麼叫？', '["問孩子「狗狗怎麼叫？」", "做出動物聲音（汪汪）", "鼓勵他模仿", "然後問「貓咪怎麼叫？」", "重複 5-6 種動物"]', '["孩子會學什麼動物聲音？", "他最喜歡模仿哪個動物？"]', '孩子現在是個小動物園！', 18, 36, '{}', '{"meaningfulBabble","usesTwoWordPhrases"}', '{"usesSentences"}', '{"language"}', 'low', 'solitary', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('數一數敲敲聲', '孩子開始對數字感興趣。', '我們來數敲敲聲！', '["說「我們要敲 1、2、3 下」", "邊說邊敲鍋子或桌子", "讓孩子試著跟著敲並數", "重複幾次，每次增加敲擊次數"]', '["孩子能跟著敲嗎？", "他會說出數字嗎？"]', '孩子在用自己的方式學習數學。', 24, 36, '{}', '{"usesTwoWordPhrases"}', '{"usesSentences"}', '{"language","social_cognitive"}', 'low', 'solitary', '{}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('蓋章藝術', '手指印章或海綿蓋章提供感官滿足感。', '我們來蓋章！', '["準備海綿印章或手指顏料", "示範如何按下並抬起", "讓孩子試著蓋章在紙上", "鼓勵他創建圖案或圖片"]', '["孩子蓋了什麼圖案？", "他想蓋多少個？"]', '孩子創造的是獨特的藝術作品。', 24, 36, '{}', '{"canGrasp"}', '{}', '{"fine_motor"}', 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 10, 20, TRUE, TRUE, TRUE, TRUE),
('醫生遊戲', '3-4 歲的孩子可以進行複雜的角色扮演。', '我們一起玩醫生遊戲！', '["準備一些簡單的醫療用具（溫度計、繃帶、聽診器）", "說「我生病了，你是醫生，幫我檢查」", "孩子可以檢查你，問你問題", "然後輪流，你成為醫生"]', '["孩子有什麼建議給你嗎？", "他怎麼幫你治療的？"]', '孩子理解醫生的角色，他很聰明。', 36, 48, '{}', '{"symbolicPlay","usesSentences"}', '{"cooperativePlay"}', '{"social_cognitive"}', 'medium', 'associative', '{"blocks"}', 'anywhere', 15, 30, FALSE, TRUE, TRUE, TRUE),
('尋寶遊戲', '孩子現在可以理解指示並遵循簡單的路線。', '我們去找寶藏！', '["藏一個小玩具或零食在房間裡", "給孩子線索「寶藏在廚房」", "讓他去尋找", "當他找到時，大力慶祝"]', '["孩子找到寶藏了嗎？", "他想再玩一次嗎？"]', '冒險家找到寶藏，太棒了！', 36, 60, '{}', '{"canFollowRules"}', '{}', '{"social_cognitive","language"}', 'medium', 'parallel', '{}', 'living_room', 10, 20, FALSE, TRUE, FALSE, TRUE),
('畫圖練習', '3 歲的孩子可以開始畫基本形狀。', '我們一起畫圓形！', '["在紙上示範畫一個大圓形", "說「現在你試試」", "讓孩子試著畫", "可以不完美，鼓勵他", "然後試著畫直線或方形"]', '["孩子畫了什麼形狀？", "他的線條越來越好嗎？"]', '孩子的畫在慢慢進步。', 30, 48, '{}', '{"canDrawCircle"}', '{"canDrawCircle"}', '{"fine_motor"}', 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 10, 20, TRUE, TRUE, TRUE, TRUE),
('簡單的擲骰子遊戲', '孩子現在可以理解輪流的規則。', '我們玩骰子遊戲！', '["拿一個大骰子", "說「你先擲」", "孩子擲骰子", "計算點數並向前移動令牌", "說「現在換我」並輪流"]', '["孩子理解輪流嗎？", "他會等待他的回合嗎？"]', '孩子在學習規則和耐心。', 36, 60, '{}', '{"canTakeTurns","usesSentences"}', '{"cooperativePlay"}', '{"social_cognitive","language"}', 'low', 'associative', '{"blocks"}', 'anywhere', 10, 20, FALSE, TRUE, TRUE, TRUE),
('自然散步探險', '3-4 歲的孩子愛探索戶外。', '我們去看看外面有什麼！', '["帶孩子去公園或街道散步", "指著不同的東西「看，松樹」、「鳥兒」", "問「那是什麼？」", "鼓勵他摘花（安全的）或收集石頭"]', '["孩子看到了什麼有趣的東西？", "他想帶什麼回家？"]', '孩子在大自然中學習。', 36, 60, '{}', '{"canDescribeEvents"}', '{}', '{"language","social_cognitive"}', 'medium', 'parallel', '{}', 'park', 15, 30, FALSE, FALSE, FALSE, TRUE);

INSERT INTO companion_activities (
  title, description, opening_line, steps, follow_up_questions, ending_line,
  min_age_months, max_age_months,
  required_capabilities, optional_capabilities, zpd_targets,
  developmental_focus, stimulation_level, play_type,
  required_resources, space_requirement,
  min_duration_minutes, max_duration_minutes,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly, is_active
) VALUES
('剪紙工藝', '4 歲的孩子開始用剪刀。', '我們一起做手工！', '["準備安全的兒童剪刀和色紙", "示範如何握剪刀", "讓孩子試著剪一些寬帶", "用膠棒粘在另一張紙上"]', '["孩子能用剪刀嗎？", "他想做什麼設計？"]', '孩子的手工藝進步很快。', 36, 60, '{}', '{"canUseScissors"}', '{"canUseScissors"}', '{"fine_motor"}', 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 15, 30, TRUE, TRUE, TRUE, TRUE),
('我們來說故事', '孩子現在可以講故事和遐想。', '我們一起創造一個故事！', '["坐舒服", "開始故事「從前，有一個小兔子」", "停止並說「然後呢？」", "孩子添加下一部分", "輪流繼續故事 5-10 分鐘"]', '["故事中有什麼發生？", "你最喜歡故事的哪一部分？"]', '你們一起創造了一個美好的故事。', 36, 60, '{}', '{"canDescribeEvents","usesSentences"}', '{"canHaveConversation"}', '{"language","social_cognitive"}', 'low', 'solitary', '{"books"}', 'anywhere', 10, 20, TRUE, TRUE, TRUE, TRUE),
('簡單烹飪', '4 歲的孩子可以幫助簡單的食譜。', '我們一起做零食！', '["選擇簡單的食譜（如餅乾或三明治）", "孩子可以幫助混合、攪拌或組合", "讓他看著烤或冷卻", "一起享受他們製作的食物"]', '["孩子做了什麼步驟？", "他最喜歡的部分是什麼？"]', '孩子親手做的食物最好吃。', 36, 60, '{}', '{}', '{}', '{"fine_motor","social_cognitive"}', 'medium', 'associative', '{"kitchen_items"}', 'kitchen', 20, 30, FALSE, TRUE, TRUE, TRUE),
('色彩實驗', '孩子現在對色彩混合感興趣。', '我們來混合顏色！', '["準備紅色、黃色、藍色的顏料", "示範混合紅色和黃色得到橙色", "讓孩子試著混合其他顏色", "觀看顏色如何變化"]', '["你混合了什麼顏色？", "你最喜歡哪個新顏色？"]', '孩子正在學習色彩魔法。', 36, 60, '{}', '{"canDrawCircle"}', '{}', '{"fine_motor"}', 'low', 'solitary', '{"paper_crayons"}', 'anywhere', 15, 25, TRUE, TRUE, TRUE, TRUE),
('跳房子', '4 歲的孩子可以進行更複雜的平衡遊戲。', '我們來玩跳房子！', '["用粉筆或膠帶在地上畫簡單的跳房子格子（4-6 個方格）", "示範如何單腳或雙腳跳", "孩子跟著跳", "可以加上簡單的計分規則"]', '["孩子跳得怎樣？", "他能跳多遠？"]', '孩子的平衡和協調在進步。', 36, 60, '{"canJumpBothFeet"}', '{"canHopOneFoot"}', '{"canHopOneFoot"}', '{"gross_motor"}', 'medium', 'parallel', '{}', 'outdoor_yard', 15, 25, FALSE, FALSE, FALSE, TRUE),
('樓梯練習', '有樓梯的孩子可以安全地練習爬樓梯。', '我們一起上樓梯！', '["陪著孩子在樓梯旁邊", "一步一步地走上去，數著「1、2、3」", "到達頂部時慶祝", "然後慢慢走下來，再重複"]', '["孩子能登上幾級？", "他會尋求幫助嗎？"]', '孩子在掌握樓梯。', 18, 60, '{}', '{"canClimbStairs"}', '{"canClimbStairs"}', '{"gross_motor"}', 'low', 'solitary', '{}', 'anywhere', 10, 20, FALSE, TRUE, TRUE, TRUE),
('手指影子戲', '用手指創建影子圖形是零成本的創意活動。', '我們來做影子戲！', '["關掉一些燈", "打開一盞燈或手電筒", "用手指在牆上做兔子、狗、鳥的影子", "孩子試著模仿"]', '["孩子能做出什麼影子？", "他能想到新的形狀嗎？"]', '孩子創作的影子戲很有趣。', 18, 60, '{}', '{}', '{}', '{"fine_motor","social_cognitive"}', 'medium', 'parallel', '{}', 'anywhere', 10, 20, FALSE, FALSE, TRUE, TRUE),
('尋找隱藏的東西', '簡單的「我在看什麼」遊戲發展觀察力。', '我在看什麼？你能猜到嗎？', '["想著房間裡的一個物品", "給孩子線索「它是紅色的」", "孩子猜測", "如果不對，給另一個線索", "直到他猜對為止"]', '["孩子猜到了嗎？", "他想輪流做遊戲嗎？"]', '孩子成為了觀察家。', 24, 60, '{}', '{"usesTwoWordPhrases"}', '{}', '{"language","social_cognitive"}', 'low', 'associative', '{}', 'anywhere', 10, 15, TRUE, TRUE, TRUE, TRUE),
('音樂和暫停遊戲', '經典遊戲，鍛鍊聽覺和肌肉控制。', '音樂開始，我們跳舞！音樂停，我們凍結！', '["播放簡單的音樂或唱一首歌", "孩子自由舞動", "突然停止音樂，說「靜止」", "孩子停止不動", "重新開始音樂，重複"]', '["孩子跳得開心嗎？", "他能靜止不動多久？"]', '孩子既學會了聽指令，又跳了舞。', 24, 60, '{}', '{"canRun"}', '{}', '{"gross_motor","language"}', 'high', 'parallel', '{"music"}', 'living_room', 10, 20, FALSE, FALSE, TRUE, TRUE),
('枕頭和毛毯堡壘', '用家裡的枕頭和毛毯建造秘密空間。', '我們來建造一座堡壘！', '["用沙發、枕頭和毛毯創建一個小帳篷或堡壘", "在裡面放一些墊子", "邀請孩子進來", "在裡面一起讀書或說悄悄話"]', '["孩子喜歡堡壘嗎？", "他想在裡面做什麼？"]', '秘密的小地方是孩子最喜歡的。', 18, 60, '{}', '{}', '{}', '{"social_cognitive"}', 'low', 'parallel', '{"cushions"}', 'living_room', 15, 30, TRUE, TRUE, TRUE, TRUE),
('擁抱和舒適', '當孩子沮喪或疲倦時，親近最重要。', '我在這裡，來抱抱。', '["蹲下來和孩子平視", "打開你的雙臂", "讓他靠在你身上", "溫柔地說「媽媽在這裡」，持續直到他平靜下來"]', '["孩子平靜下來了嗎？", "他需要多久的抱抱？"]', '你的溫暖是孩子最好的安慰。', 0, 60, '{}', '{}', '{}', '{"emotional"}', 'low', 'solitary', '{}', 'anywhere', 5, 15, TRUE, TRUE, TRUE, TRUE),
('吹泡泡放鬆', '當孩子感到沮喪時，深呼吸幫助。', '我們來吹泡泡，慢慢吹。', '["拿出泡泡液和泡泡棒", "示範緩慢吹泡泡", "說「慢慢吹，看看能吹出最大的泡泡」", "孩子跟著做，觀看泡泡漂浮"]', '["孩子吹的泡泡有多大？", "他最喜歡泡泡嗎？"]', '深呼吸幫助孩子變得更平靜。', 18, 60, '{}', '{}', '{}', '{"emotional"}', 'low', 'solitary', '{"kitchen_items"}', 'anywhere', 5, 10, TRUE, TRUE, TRUE, TRUE),
('生病時的舒適故事', '孩子生病時，簡單、平靜的活動最好。', '我們一起看書，好嗎？', '["坐在孩子身邊，帶上毯子和枕頭", "拿一本他喜歡的書，輕輕唸", "讓他靠著你", "如果他睡著了，就讓他睡"]', '["孩子聽得專心嗎？", "他想再聽一遍嗎？"]', '陪伴就是最好的藥。', 12, 60, '{}', '{}', '{}', '{"emotional","language"}', 'low', 'solitary', '{"books"}', 'bedroom', 15, 30, TRUE, TRUE, TRUE, TRUE),
('感官瓶', '一個充滿閃粉和色彩液體的瓶子幫助平靜。', '看著瓶子裡的星星慢慢落下。', '["準備或購買一個感官瓶", "坐在孩子身邊", "搖晃瓶子", "一起觀看粒子慢慢掉落，說「慢慢的，很平靜」"]', '["孩子看著瓶子的反應？", "他想再搖嗎？"]', '孩子的呼吸變慢了，他變得平靜了。', 12, 60, '{}', '{}', '{}', '{"emotional"}', 'low', 'solitary', '{}', 'bedroom', 5, 15, TRUE, TRUE, TRUE, TRUE),
('睡前逐步放鬆', '引導放鬆幫助孩子進入睡眠。', '我們的身體現在放鬆，準備睡眠。', '["孩子躺在床上", "用輕柔的聲音說「現在我們放鬆你的腳趾...感覺它們重重的」", "慢慢向上移動到腿、腹部、手臂、頭部", "使用緩慢、有節奏的語調"]', '["孩子有放鬆嗎？", "他睡著了嗎？"]', '孩子的身體現在準備好睡眠了。', 24, 60, '{}', '{}', '{}', '{"emotional"}', 'low', 'solitary', '{}', 'bedroom', 10, 20, TRUE, TRUE, TRUE, TRUE),
('大自然感官遊戲', '戶外活動對身體和心理健康都很好。', '我們來感受大自然！', '["去公園或花園", "讓孩子摸樹皮（說「粗粗的」）、草地（說「軟軟的」）", "聽鳥叫", "聞花香或土壤味道"]', '["孩子發現了什麼紋理？", "他最喜歡什麼感覺？"]', '大自然給了孩子最好的課程。', 18, 60, '{}', '{}', '{}', '{"sensory","language"}', 'medium', 'parallel', '{}', 'park', 15, 30, FALSE, TRUE, FALSE, TRUE),
('洗澡時的水上遊戲', '洗澡時間可以變成玩樂時間。', '我們來玩水！', '["在浴缸或淺盆中放溫水", "添加塑料玩具、漏勺、杯子", "孩子自由探索——倒水、漂浮物體、濺水", "隨著安全性進行遊戲"]', '["孩子最喜歡用水做什麼？", "他發現了什麼？"]', '孩子在玩的時候也在學習。', 6, 36, '{}', '{}', '{}', '{"sensory","gross_motor"}', 'medium', 'solitary', '{}', 'bathroom', 10, 20, FALSE, TRUE, TRUE, TRUE),
('安全食品探索', '孩子開始嘗試新食品。有趣的演示可以鼓勵。', '我們來嚐嚐不同的味道！', '["準備幾種安全、年齡適合的食品（香蕉、葡萄乾、起司、蘋果）", "讓孩子看和聞", "問「你想嘗嘗嗎？」", "如果他試著吃，獎勵他的勇敢"]', '["孩子願意嘗試嗎？", "他最喜歡什麼味道？"]', '孩子在發現新的喜歡的食物。', 6, 36, '{}', '{}', '{}', '{"sensory","social_cognitive"}', 'low', 'solitary', '{"kitchen_items"}', 'kitchen', 10, 15, TRUE, TRUE, TRUE, TRUE);
