import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendEmail } from '../lib/email/resend'
import { weeklyRecapEmail } from '../lib/email/templates'

describe('weeklyRecapEmail', () => {
  it('有陪伴：標題帶次數、含連續天數與 CTA，且無孩子個資（泛稱「孩子」）', () => {
    const m = weeklyRecapEmail({ to: 'a@b.com', weeklySessions: 4, streak: 3, appUrl: 'https://x' })
    expect(m.subject).toContain('4')
    expect(m.text).toContain('連續陪伴 3 天')
    expect(m.html).toContain('https://x/now')
    expect(`${m.subject}${m.text}${m.html}`).not.toMatch(/暱稱|生日/)
  })

  it('久未陪：給溫柔不施壓的重啟文案', () => {
    const m = weeklyRecapEmail({ to: 'a@b.com', weeklySessions: 0, streak: 0 })
    expect(m.text).toContain('沒關係')
  })

  it('HTML escape：CTA URL 與文字不被注入', () => {
    const m = weeklyRecapEmail({
      to: 'a@b.com',
      weeklySessions: 1,
      streak: 1,
      appUrl: 'https://x"><script>',
    })
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&quot;')
  })
})

describe('sendEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  const msg = { to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't' }

  it('未設 RESEND_API_KEY → 休眠不送', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(await sendEmail(msg)).toEqual({ ok: false, dormant: true })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('有金鑰 + Resend 200 → ok 回 id', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ id: 'em_1' }) })),
    )
    expect(await sendEmail(msg)).toEqual({ ok: true, id: 'em_1' })
  })

  it('Resend 非 2xx → ok:false 帶錯誤、不丟例外', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 422, json: async () => ({}) })),
    )
    const r = await sendEmail(msg)
    expect(r).toMatchObject({ ok: false, dormant: false })
  })

  it('fetch throw（網路）→ ok:false、不丟例外', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('net')
      }),
    )
    expect((await sendEmail(msg)).ok).toBe(false)
  })
})
