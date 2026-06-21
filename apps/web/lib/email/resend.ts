// Email 寄送（Resend）。再觸達是觸及「裝不了 PWA / 關了推播」多數疲憊家長的關鍵管道。
// 休眠優先：未設 RESEND_API_KEY 時完全不送、回 dormant，與站上其他整合一致——
// 實際開通需設金鑰 + 寄件網域驗證 + 收件人同意模型（見 CURRENT_SPRINT）。
//
// 安全：金鑰只在伺服器端 env，不寫 log；不在此層放任何孩子個資（內容由呼叫端組，
// 且 email 比 App 內更不可控，呼叫端應避免帶暱稱/生日）。

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; dormant: true }
  | { ok: false; dormant: false; error: string }

function fromAddress(): string {
  // 寄件人需為 Resend 已驗證網域；未設時用站點預設（開通前不會真的送出）。
  return process.env.EMAIL_FROM || 'FamilyPlay <noreply@familyplay.nomoneydaddy.app>'
}

/** 寄一封 email。未設 RESEND_API_KEY 即休眠（不送、回 dormant）。 */
export async function sendEmail(msg: EmailMessage): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, dormant: true }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    })
    if (!res.ok) {
      return { ok: false, dormant: false, error: `Resend ${res.status}` }
    }
    const data = (await res.json().catch(() => null)) as { id?: string } | null
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    return { ok: false, dormant: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}
