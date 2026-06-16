export const CAPABILITY_KEYS = {
  // 身體動作（Gross Motor）
  CAN_ROLL: 'canRoll', // 翻身 3–5m
  CAN_SIT_UNSUPPORTED: 'canSitUnsupported', // 自己坐穩 6–8m
  CAN_CRAWL: 'canCrawl', // 爬行 7–10m
  CAN_PULL_TO_STAND: 'canPullToStand', // 扶著站起 9–11m
  CAN_WALK_INDEPENDENTLY: 'canWalkIndependently', // 獨立走路 11–14m
  CAN_RUN: 'canRun', // 跑步 14–18m
  CAN_JUMP_BOTH_FEET: 'canJumpBothFeet', // 雙腳跳起 24–30m
  CAN_HOP_ONE_FOOT: 'canHopOneFoot', // 單腳跳 36–48m
  CAN_CLIMB_STAIRS: 'canClimbStairs', // 扶欄上下樓梯 18–24m

  // 精細動作（Fine Motor）
  CAN_GRASP: 'canGrasp', // 抓握 3–5m
  CAN_PINCER_GRIP: 'canPincerGrip', // 拇指食指夾取 8–10m
  CAN_STACK_BLOCKS_3: 'canStackBlocks3', // 疊 3 個積木 12–15m
  CAN_SCRIBBLE: 'canScribble', // 蠟筆塗鴉 15–18m
  CAN_DRAW_CIRCLE: 'canDrawCircle', // 畫圓形 30–36m
  CAN_USE_SCISSORS: 'canUseScissors', // 用剪刀 36–48m
  CAN_WRITE_NAME: 'canWriteName', // 寫名字 48–60m

  // 語言溝通（Language）
  RESPONDS_TO_NAME: 'respondsToName', // 聽到名字回應 6–8m
  MEANINGFUL_BABBLE: 'meaningfulBabble', // 有意義音節 8–10m
  HAS_VOCABULARY_10: 'hasVocabulary10', // 10 個以上詞彙 12–15m
  USES_TWO_WORD_PHRASES: 'usesTwoWordPhrases', // 兩字短句 18–24m
  USES_SENTENCES: 'usesSentences', // 完整句子 30–36m
  CAN_DESCRIBE_EVENTS: 'canDescribeEvents', // 描述今天的事 36–48m
  CAN_HAVE_CONVERSATION: 'canHaveConversation', // 來回對話 48–60m

  // 社交認知（Social Cognitive）
  OBJECT_PERMANENCE: 'objectPermanence', // 物體恆存 6–10m
  IMITATES_ACTIONS: 'imitatesActions', // 模仿動作 8–12m
  CAN_TAKE_TURNS: 'canTakeTurns', // 輪流玩 18–24m
  SYMBOLIC_PLAY: 'symbolicPlay', // 假扮遊戲 18–24m
  COOPERATIVE_PLAY: 'cooperativePlay', // 合作遊戲 36–48m
  CAN_FOLLOW_RULES: 'canFollowRules', // 遵守規則 48–60m

  // 情緒調節（Emotional Regulation）
  SELF_SOOTHING: 'selfSoothing', // 自我安撫 6–12m
  TOLERATES_FRUSTRATION: 'toleratesFrustration', // 承受挫折 24–36m
} as const

export type CapabilityKey = (typeof CAPABILITY_KEYS)[keyof typeof CAPABILITY_KEYS]

export const ALLOWED_CAPABILITY_KEYS = Object.values(CAPABILITY_KEYS) as CapabilityKey[]

export type CapabilityProfile = Partial<Record<CapabilityKey, boolean>>
