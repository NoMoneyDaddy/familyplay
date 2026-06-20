import { describe, expect, it } from 'vitest'
import { type LogCandidate, parseNaturalLog } from './natural-log'

const candidates: LogCandidate[] = [
  { id: 'a1', title: '積木疊高' },
  { id: 'a2', title: '繪本共讀' },
  { id: 'a3', title: '感官黏土' },
]

describe('parseNaturalLog — 活動比對', () => {
  it('完整標題出現 → 直接命中', () => {
    expect(parseNaturalLog('今天玩繪本共讀', candidates).activityId).toBe('a2')
  })

  it('部分字元覆蓋（玩積木 → 積木疊高）→ 命中', () => {
    const r = parseNaturalLog('波波今天玩積木玩超久', candidates)
    expect(r.activityId).toBe('a1')
    expect(r.activityTitle).toBe('積木疊高')
  })

  it('單一常見字不誤判（只有「高」不夠）', () => {
    expect(parseNaturalLog('今天心情很高昂', candidates).activityId).toBeNull()
  })

  it('沒有候選或對不上 → null', () => {
    expect(parseNaturalLog('去公園散步', candidates).activityId).toBeNull()
    expect(parseNaturalLog('玩積木', []).activityId).toBeNull()
  })
})

describe('parseNaturalLog — outcome', () => {
  it('玩超久/玩完 → completed', () => {
    expect(parseNaturalLog('玩積木玩超久', candidates).outcome).toBe('completed')
    expect(parseNaturalLog('整個玩完了', candidates).outcome).toBe('completed')
  })

  it('不玩了/沒興趣 → abandoned', () => {
    expect(parseNaturalLog('玩一下下就不玩了', candidates).outcome).toBe('abandoned')
    expect(parseNaturalLog('對黏土沒興趣', candidates).outcome).toBe('abandoned')
  })

  it('玩了一下 → tried', () => {
    expect(parseNaturalLog('有玩了一下繪本', candidates).outcome).toBe('tried')
  })

  it('沒有訊號 → null', () => {
    expect(parseNaturalLog('今天天氣很好', candidates).outcome).toBeNull()
  })
})

describe('parseNaturalLog — reaction', () => {
  it('開心/笑 → happy', () => {
    expect(parseNaturalLog('玩得很開心', candidates).reaction).toBe('happy')
  })

  it('專心/投入 → engaged（無 happy 關鍵字時）', () => {
    expect(parseNaturalLog('整場超專心', candidates).reaction).toBe('engaged')
  })

  it('同時有 happy 與 engaged 訊號 → happy 優先（正向情緒先報）', () => {
    expect(parseNaturalLog('很開心又很專心', candidates).reaction).toBe('happy')
  })

  it('睡著/安靜下來 → calmed', () => {
    expect(parseNaturalLog('聽故事後就睡著了', candidates).reaction).toBe('calmed')
  })

  it('大哭/不要 → leaving', () => {
    expect(parseNaturalLog('一下就大哭走開', candidates).reaction).toBe('leaving')
  })

  it('沒有訊號 → null', () => {
    expect(parseNaturalLog('今天有記錄', candidates).reaction).toBeNull()
  })

  it('「玩到不要不要的」（口語＝超起勁）不誤標 leaving', () => {
    // 修掉單獨「不要」過度匹配的回歸測試
    expect(parseNaturalLog('玩積木玩到不要不要的', candidates).reaction).not.toBe('leaving')
  })

  it('「不要玩了」→ leaving', () => {
    expect(parseNaturalLog('沒幾下就不要玩了', candidates).reaction).toBe('leaving')
  })
})

describe('parseNaturalLog — 綜合與邊界', () => {
  it('一句話三維度齊發', () => {
    const r = parseNaturalLog('波波今天玩積木玩超久，超開心', candidates)
    expect(r).toEqual({
      activityId: 'a1',
      activityTitle: '積木疊高',
      outcome: 'completed',
      reaction: 'happy',
    })
  })

  it('空字串 → 全 null', () => {
    expect(parseNaturalLog('   ', candidates)).toEqual({
      activityId: null,
      activityTitle: null,
      outcome: null,
      reaction: null,
    })
  })
})
