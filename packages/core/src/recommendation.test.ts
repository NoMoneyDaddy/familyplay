import { describe, expect, it } from 'vitest'
import { STARTER_ACTIVITIES } from './activity-catalog'
import { type Activity, type RecommendationContext, recommend } from './recommendation'

// 一個寬鬆、會通過大部分過濾的基礎活動，測試時只覆寫需要的欄位
function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'base',
    title: '基礎活動',
    openingLine: '一起玩吧',
    steps: ['坐下', '一起玩'],
    requiredCapabilities: [],
    stimulationLevel: 'low',
    requiredResources: [],
    spaceRequirement: 'anywhere',
    minDurationMinutes: 5,
    maxDurationMinutes: 15,
    costLevel: 'free',
    cleanupLevel: 'none',
    prepMinutes: 0,
    isActive: true,
    ...overrides,
  }
}

function makeContext(overrides: Partial<RecommendationContext> = {}): RecommendationContext {
  return {
    ageMonths: 36,
    stageKey: 'preschooler',
    achievedCapabilities: [],
    zpdTargets: [],
    parentEnergy: 'medium',
    companionContext: 'normal',
    space: 'living_room',
    availableResources: [],
    availableMinutes: 30,
    recentActivityIds: [],
    ...overrides,
  }
}

describe('recommend — 永不回傳空結果', () => {
  it('沒有任何活動通過時回傳保底方案', () => {
    const result = recommend([], makeContext())
    expect(result.usedFallback).toBe(true)
    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0].activity.isFallback).toBe(true)
    expect(result.recommendations[0].reasons).toContain('保底方案')
  })

  it('全部被過濾掉時也回傳保底方案', () => {
    const tooOld = makeActivity({ minAgeMonths: 200 })
    const result = recommend([tooOld], makeContext({ ageMonths: 36 }))
    expect(result.usedFallback).toBe(true)
    expect(result.recommendations[0].activity.isFallback).toBe(true)
  })
})

describe('Step 1 — 年齡安全過濾', () => {
  it('排除尚未到達最小年齡的活動', () => {
    const a = makeActivity({ id: 'too-advanced', minAgeMonths: 48 })
    const result = recommend([a], makeContext({ ageMonths: 24 }))
    expect(result.usedFallback).toBe(true)
  })

  it('排除超過最大年齡的活動', () => {
    const a = makeActivity({ id: 'baby-only', maxAgeMonths: 12 })
    const result = recommend([a], makeContext({ ageMonths: 36 }))
    expect(result.usedFallback).toBe(true)
  })

  it('排除 isActive=false 的活動', () => {
    const a = makeActivity({ id: 'inactive', isActive: false })
    const result = recommend([a], makeContext())
    expect(result.usedFallback).toBe(true)
  })

  it('0–3 歲禁止含小零件材料的活動', () => {
    const a = makeActivity({ id: 'coins', steps: ['用硬幣排排看'] })
    const result = recommend([a], makeContext({ ageMonths: 8, stageKey: 'sitting_baby' }))
    expect(result.usedFallback).toBe(true)
  })

  it('3 歲以上允許同樣含硬幣的活動', () => {
    const a = makeActivity({ id: 'coins', steps: ['用硬幣排排看'] })
    const result = recommend([a], makeContext({ ageMonths: 40, stageKey: 'preschooler' }))
    expect(result.usedFallback).toBe(false)
    expect(result.recommendations[0].activity.id).toBe('coins')
  })
})

describe('Step 2 — 情境安全規則', () => {
  it('睡前排除高刺激活動', () => {
    const calm = makeActivity({ id: 'calm', stimulationLevel: 'low' })
    const wild = makeActivity({ id: 'wild', stimulationLevel: 'high' })
    const result = recommend([calm, wild], makeContext({ companionContext: 'bedtime' }))
    const ids = result.recommendations.map((r) => r.activity.id)
    expect(ids).toContain('calm')
    expect(ids).not.toContain('wild')
  })

  it('睡前排除明確標記 isBedtimeSafe=false 的活動', () => {
    const a = makeActivity({ id: 'not-bed', stimulationLevel: 'low', isBedtimeSafe: false })
    const result = recommend([a], makeContext({ companionContext: 'bedtime' }))
    expect(result.usedFallback).toBe(true)
  })

  it('情緒風暴排除競賽關鍵字活動', () => {
    const a = makeActivity({ id: 'compete', steps: ['看誰贏', '比賽跑'] })
    const result = recommend([a], makeContext({ companionContext: 'emotional_crisis' }))
    expect(result.usedFallback).toBe(true)
  })

  it('生病日排除高刺激', () => {
    const a = makeActivity({ id: 'wild', stimulationLevel: 'high', isSickDaySafe: true })
    const result = recommend([a], makeContext({ companionContext: 'sick_day' }))
    expect(result.usedFallback).toBe(true)
  })

  it('normal 情境不做情境安全過濾', () => {
    const a = makeActivity({ id: 'wild', stimulationLevel: 'high' })
    const result = recommend([a], makeContext({ companionContext: 'normal', parentEnergy: 'high' }))
    expect(result.usedFallback).toBe(false)
  })
})

describe('Step 3 — 能力匹配過濾', () => {
  it('缺少 requiredCapabilities 時排除', () => {
    const a = makeActivity({ id: 'needs-walk', requiredCapabilities: ['canWalkIndependently'] })
    const result = recommend([a], makeContext({ achievedCapabilities: [] }))
    expect(result.usedFallback).toBe(true)
  })

  it('具備全部 requiredCapabilities 時保留', () => {
    const a = makeActivity({ id: 'needs-walk', requiredCapabilities: ['canWalkIndependently'] })
    const result = recommend(
      [a],
      makeContext({ achievedCapabilities: ['canWalkIndependently', 'canRun'] }),
    )
    expect(result.usedFallback).toBe(false)
    expect(result.recommendations[0].activity.id).toBe('needs-walk')
  })
})

describe('Step 4 — ZPD 評分', () => {
  it('命中發展中能力的活動分數較高並排前面', () => {
    const plain = makeActivity({ id: 'plain' })
    const zpd = makeActivity({ id: 'zpd', zpdTargets: ['usesSentences'] })
    const result = recommend([plain, zpd], makeContext({ zpdTargets: ['usesSentences'] }))
    expect(result.recommendations[0].activity.id).toBe('zpd')
    expect(result.recommendations[0].reasons.some((r) => r.includes('促進發展中能力'))).toBe(true)
  })
})

describe('Step 5 — 情境過濾', () => {
  it('場景不符時排除（非 anywhere）', () => {
    const a = makeActivity({ id: 'outdoor', spaceRequirement: 'park' })
    const result = recommend([a], makeContext({ space: 'living_room' }))
    expect(result.usedFallback).toBe(true)
  })

  it('anywhere 活動在任何場景皆可', () => {
    const a = makeActivity({ id: 'any', spaceRequirement: 'anywhere' })
    const result = recommend([a], makeContext({ space: 'car' }))
    expect(result.usedFallback).toBe(false)
  })

  it('所需資源不可用時排除', () => {
    const a = makeActivity({ id: 'needs-ball', requiredResources: ['balls'] })
    const result = recommend([a], makeContext({ availableResources: ['books'] }))
    expect(result.usedFallback).toBe(true)
  })

  it('所需資源可用時保留', () => {
    const a = makeActivity({ id: 'needs-ball', requiredResources: ['balls'] })
    const result = recommend([a], makeContext({ availableResources: ['balls', 'books'] }))
    expect(result.usedFallback).toBe(false)
  })

  it('活動時間超過可用時間時排除', () => {
    const a = makeActivity({ id: 'long', minDurationMinutes: 30 })
    const result = recommend([a], makeContext({ availableMinutes: 10 }))
    expect(result.usedFallback).toBe(true)
  })

  it('家長低電量排除高刺激活動', () => {
    const a = makeActivity({ id: 'wild', stimulationLevel: 'high' })
    const result = recommend([a], makeContext({ parentEnergy: 'low' }))
    expect(result.usedFallback).toBe(true)
  })
})

describe('Step 6 — 優先排序', () => {
  it('零花費活動排在付費活動前面', () => {
    const free = makeActivity({ id: 'free', costLevel: 'free' })
    const paid = makeActivity({ id: 'paid', costLevel: 'paid' })
    const result = recommend([paid, free], makeContext())
    expect(result.recommendations[0].activity.id).toBe('free')
  })

  it('免收拾活動分數高於高收拾活動', () => {
    const clean = makeActivity({ id: 'clean', cleanupLevel: 'none', costLevel: 'free' })
    const messy = makeActivity({ id: 'messy', cleanupLevel: 'high', costLevel: 'free' })
    const result = recommend([messy, clean], makeContext())
    expect(result.recommendations[0].activity.id).toBe('clean')
  })

  it('準備時間越短分數越高', () => {
    const quick = makeActivity({ id: 'quick', prepMinutes: 0, cleanupLevel: 'low' })
    const slow = makeActivity({ id: 'slow', prepMinutes: 10, cleanupLevel: 'low' })
    const result = recommend([slow, quick], makeContext())
    expect(result.recommendations[0].activity.id).toBe('quick')
  })

  it('limit 參數限制回傳數量', () => {
    const activities = Array.from({ length: 5 }, (_, i) => makeActivity({ id: `a${i}` }))
    const result = recommend(activities, makeContext(), 2)
    expect(result.recommendations).toHaveLength(2)
  })
})

describe('Step 7 — 歷史降權', () => {
  it('近期出現過的活動被降權', () => {
    const a = makeActivity({ id: 'seen' })
    const fresh = recommend([a], makeContext()).recommendations[0].score
    const penalized = recommend([a], makeContext({ recentActivityIds: ['seen'] }))
    expect(penalized.recommendations[0].score).toBeLessThan(fresh)
    expect(penalized.recommendations[0].reasons.some((r) => r.includes('降權'))).toBe(true)
  })

  it('降權後仍可能被同類新活動超越', () => {
    const seen = makeActivity({ id: 'seen', costLevel: 'free' })
    const fresh = makeActivity({ id: 'fresh', costLevel: 'free' })
    const result = recommend([seen, fresh], makeContext({ recentActivityIds: ['seen'] }))
    expect(result.recommendations[0].activity.id).toBe('fresh')
  })
})

describe('排序穩定性', () => {
  it('分數相同時依 id 字母序排列', () => {
    const b = makeActivity({ id: 'b' })
    const a = makeActivity({ id: 'a' })
    const result = recommend([b, a], makeContext())
    expect(result.recommendations.map((r) => r.activity.id)).toEqual(['a', 'b'])
  })
})

describe('與內建活動庫整合', () => {
  it('學齡前正常情境能拿到真實活動推薦', () => {
    const result = recommend(
      STARTER_ACTIVITIES,
      makeContext({
        ageMonths: 40,
        stageKey: 'preschooler',
        achievedCapabilities: ['usesSentences', 'usesTwoWordPhrases', 'canGrasp'],
        availableResources: ['books'],
        space: 'living_room',
      }),
    )
    expect(result.usedFallback).toBe(false)
    expect(result.recommendations.length).toBeGreaterThan(0)
    for (const r of result.recommendations) {
      expect(r.activity.isActive).not.toBe(false)
    }
  })

  it('睡前情境只會推薦低刺激的真實活動', () => {
    const result = recommend(
      STARTER_ACTIVITIES,
      makeContext({
        ageMonths: 40,
        stageKey: 'preschooler',
        achievedCapabilities: ['usesSentences'],
        availableResources: ['books'],
        space: 'bedroom',
        companionContext: 'bedtime',
      }),
    )
    for (const r of result.recommendations) {
      expect(r.activity.stimulationLevel).not.toBe('high')
    }
  })
})
