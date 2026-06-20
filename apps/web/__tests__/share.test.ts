import { describe, expect, it } from 'vitest'
import { lineShareUrl } from '../lib/share'

describe('lineShareUrl', () => {
  it('組出官方文字分享端點且 URL-encode', () => {
    const url = lineShareUrl('波波的小卡 玩積木')
    expect(url.startsWith('https://line.me/R/msg/text/?')).toBe(true)
    expect(url).toContain(encodeURIComponent('波波的小卡 玩積木'))
  })

  it('特殊字元（& # 換行）正確編碼', () => {
    const url = lineShareUrl('a&b\n#c')
    expect(url).toContain(encodeURIComponent('a&b\n#c'))
    expect(url).not.toContain('\n')
  })

  it('過長文字截斷在 1000 字', () => {
    const long = 'x'.repeat(5000)
    const url = lineShareUrl(long)
    const encoded = url.split('?')[1]
    expect(decodeURIComponent(encoded).length).toBe(1000)
  })

  it('空字串不爆', () => {
    expect(lineShareUrl('')).toBe('https://line.me/R/msg/text/?')
  })
})
