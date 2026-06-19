import type { CapabilityKey } from '@familyplay/core'

export type AssessmentDomain =
  | 'gross_motor'
  | 'fine_motor'
  | 'language'
  | 'social_cognitive'
  | 'emotional'

export interface MilestoneItem {
  key: CapabilityKey
  label: string
  typicalMonths: string
  domain: AssessmentDomain
  nextMilestone?: CapabilityKey // ZPD: what comes after this
}

export const MILESTONES: MilestoneItem[] = [
  // 身體動作
  {
    key: 'canRoll',
    label: '翻身',
    typicalMonths: '3–5 個月',
    domain: 'gross_motor',
    nextMilestone: 'canSitUnsupported',
  },
  {
    key: 'canSitUnsupported',
    label: '自己坐穩',
    typicalMonths: '6–8 個月',
    domain: 'gross_motor',
    nextMilestone: 'canCrawl',
  },
  {
    key: 'canCrawl',
    label: '爬行',
    typicalMonths: '7–10 個月',
    domain: 'gross_motor',
    nextMilestone: 'canPullToStand',
  },
  {
    key: 'canPullToStand',
    label: '扶著站起來',
    typicalMonths: '9–11 個月',
    domain: 'gross_motor',
    nextMilestone: 'canWalkIndependently',
  },
  {
    key: 'canWalkIndependently',
    label: '獨立走路',
    typicalMonths: '11–14 個月',
    domain: 'gross_motor',
    nextMilestone: 'canRun',
  },
  {
    key: 'canRun',
    label: '跑步',
    typicalMonths: '14–18 個月',
    domain: 'gross_motor',
    nextMilestone: 'canJumpBothFeet',
  },
  {
    key: 'canClimbStairs',
    label: '扶欄上下樓梯',
    typicalMonths: '18–24 個月',
    domain: 'gross_motor',
    nextMilestone: 'canJumpBothFeet',
  },
  {
    key: 'canJumpBothFeet',
    label: '雙腳跳起',
    typicalMonths: '24–30 個月',
    domain: 'gross_motor',
    nextMilestone: 'canHopOneFoot',
  },
  { key: 'canHopOneFoot', label: '單腳跳', typicalMonths: '36–48 個月', domain: 'gross_motor' },

  // 精細動作
  {
    key: 'canGrasp',
    label: '抓握物品',
    typicalMonths: '3–5 個月',
    domain: 'fine_motor',
    nextMilestone: 'canPincerGrip',
  },
  {
    key: 'canPincerGrip',
    label: '拇指食指夾取',
    typicalMonths: '8–10 個月',
    domain: 'fine_motor',
    nextMilestone: 'canStackBlocks3',
  },
  {
    key: 'canStackBlocks3',
    label: '疊 3 個以上積木',
    typicalMonths: '12–15 個月',
    domain: 'fine_motor',
    nextMilestone: 'canScribble',
  },
  {
    key: 'canScribble',
    label: '蠟筆塗鴉',
    typicalMonths: '15–18 個月',
    domain: 'fine_motor',
    nextMilestone: 'canDrawCircle',
  },
  {
    key: 'canDrawCircle',
    label: '畫圓形',
    typicalMonths: '30–36 個月',
    domain: 'fine_motor',
    nextMilestone: 'canUseScissors',
  },
  {
    key: 'canUseScissors',
    label: '用剪刀剪紙',
    typicalMonths: '36–48 個月',
    domain: 'fine_motor',
    nextMilestone: 'canWriteName',
  },
  { key: 'canWriteName', label: '寫自己名字', typicalMonths: '48–60 個月', domain: 'fine_motor' },

  // 語言溝通
  {
    key: 'respondsToName',
    label: '聽到名字回應',
    typicalMonths: '6–8 個月',
    domain: 'language',
    nextMilestone: 'meaningfulBabble',
  },
  {
    key: 'meaningfulBabble',
    label: '有意義音節',
    typicalMonths: '8–10 個月',
    domain: 'language',
    nextMilestone: 'hasVocabulary10',
  },
  {
    key: 'hasVocabulary10',
    label: '10 個以上詞彙',
    typicalMonths: '12–15 個月',
    domain: 'language',
    nextMilestone: 'usesTwoWordPhrases',
  },
  {
    key: 'usesTwoWordPhrases',
    label: '兩字短句',
    typicalMonths: '18–24 個月',
    domain: 'language',
    nextMilestone: 'usesSentences',
  },
  {
    key: 'usesSentences',
    label: '完整句子',
    typicalMonths: '30–36 個月',
    domain: 'language',
    nextMilestone: 'canDescribeEvents',
  },
  {
    key: 'canDescribeEvents',
    label: '描述今天的事',
    typicalMonths: '36–48 個月',
    domain: 'language',
    nextMilestone: 'canHaveConversation',
  },
  {
    key: 'canHaveConversation',
    label: '來回對話',
    typicalMonths: '48–60 個月',
    domain: 'language',
  },

  // 社交認知
  {
    key: 'objectPermanence',
    label: '物體恆存',
    typicalMonths: '6–10 個月',
    domain: 'social_cognitive',
    nextMilestone: 'imitatesActions',
  },
  {
    key: 'imitatesActions',
    label: '模仿動作',
    typicalMonths: '8–12 個月',
    domain: 'social_cognitive',
    nextMilestone: 'canTakeTurns',
  },
  {
    key: 'canTakeTurns',
    label: '輪流玩',
    typicalMonths: '18–24 個月',
    domain: 'social_cognitive',
    nextMilestone: 'symbolicPlay',
  },
  {
    key: 'symbolicPlay',
    label: '假扮遊戲',
    typicalMonths: '18–24 個月',
    domain: 'social_cognitive',
    nextMilestone: 'cooperativePlay',
  },
  {
    key: 'cooperativePlay',
    label: '合作遊戲',
    typicalMonths: '36–48 個月',
    domain: 'social_cognitive',
    nextMilestone: 'canFollowRules',
  },
  {
    key: 'canFollowRules',
    label: '遵守規則',
    typicalMonths: '48–60 個月',
    domain: 'social_cognitive',
  },

  // 情緒調節
  {
    key: 'selfSoothing',
    label: '自我安撫',
    typicalMonths: '6–12 個月',
    domain: 'emotional',
    nextMilestone: 'toleratesFrustration',
  },
  {
    key: 'toleratesFrustration',
    label: '承受挫折',
    typicalMonths: '24–36 個月',
    domain: 'emotional',
  },
]

export const MILESTONE_MAP = new Map(MILESTONES.map((m) => [m.key, m]))

// 能力 key（camelCase，與 CAPABILITY_KEYS 的值、DB 的 zpd_targets 一致）→ 中文標籤。
// 給「會練到什麼能力」這類面向家長的顯示用；白名單外的 key 查不到回 undefined。
export const CAPABILITY_LABELS: Record<string, string> = Object.fromEntries(
  MILESTONES.map((m) => [m.key, m.label]),
)

export function getZpdTargets(achievedKeys: CapabilityKey[]): CapabilityKey[] {
  const achieved = new Set(achievedKeys)
  const zpd: CapabilityKey[] = []

  for (const key of achievedKeys) {
    const milestone = MILESTONE_MAP.get(key)
    if (milestone?.nextMilestone && !achieved.has(milestone.nextMilestone)) {
      zpd.push(milestone.nextMilestone)
    }
  }

  return [...new Set(zpd)]
}
