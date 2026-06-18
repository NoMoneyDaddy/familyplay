import { createClient } from '@supabase/supabase-js'

// 注意：本模組僅由 server component（app/admin/page.tsx）匯入，含 service role 金鑰，
// 切勿在任何 client component 匯入。（'server-only' 套件未安裝於此 workspace，故以此註解約束。）
// 所有 fetch 都 no-store（即時、不快取）。每個來源未設定金鑰時回 { configured: false }，
// 讓 dashboard 以「dormant until configured」方式呈現，與 ads/push 一致。

// 外部請求一律加 timeout：避免上游卡住時阻塞整個 /admin 的 server render。
const FETCH_TIMEOUT_MS = 6000
async function fetchT(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

export type SupabaseMetrics = {
  users: number
  children: number
  households: number
  active_activities: number
  total_activities: number
  logs_total: number
  logs_today: number
  logs_7d: number
  reminder_subs: number
  plans: Record<string, number>
  activities_by_focus: Record<string, number>
  recent_logs: { title: string; created_at: string }[]
}

export type Panel<T> =
  | { ok: true; data: T }
  | { ok: false; configured: false; hint: string }
  | { ok: false; configured: true; error: string }

export async function getSupabaseMetrics(): Promise<Panel<SupabaseMetrics>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return { ok: false, configured: false, hint: '需要 SUPABASE_SERVICE_ROLE_KEY' }
  }
  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data, error } = await admin.rpc('admin_dashboard_metrics')
    if (error) return { ok: false, configured: true, error: error.message }
    return { ok: true, data: data as SupabaseMetrics }
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export type GithubMetrics = {
  repo: string
  commits: { sha: string; message: string; author: string; date: string }[]
  openPRs: { number: number; title: string; user: string; draft: boolean }[]
  latestRun: { name: string; status: string; conclusion: string | null; createdAt: string } | null
}

export async function getGithubMetrics(): Promise<Panel<GithubMetrics>> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO || 'NoMoneyDaddy/familyplay'
  if (!token) {
    return { ok: false, configured: false, hint: '設定 GITHUB_TOKEN（read-only）即可顯示' }
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  try {
    const base = `https://api.github.com/repos/${repo}`
    const [commitsRes, prsRes, runsRes] = await Promise.all([
      fetchT(`${base}/commits?sha=main&per_page=5`, { headers, cache: 'no-store' }),
      fetchT(`${base}/pulls?state=open&per_page=10`, { headers, cache: 'no-store' }),
      fetchT(`${base}/actions/runs?branch=main&per_page=1`, { headers, cache: 'no-store' }),
    ])
    if (!commitsRes.ok) {
      return { ok: false, configured: true, error: `GitHub ${commitsRes.status}` }
    }
    // biome-ignore lint/suspicious/noExplicitAny: external API JSON
    const commitsJson: any[] = await commitsRes.json()
    // biome-ignore lint/suspicious/noExplicitAny: external API JSON
    const prsJson: any[] = prsRes.ok ? await prsRes.json() : []
    // biome-ignore lint/suspicious/noExplicitAny: external API JSON
    const runsJson: any = runsRes.ok ? await runsRes.json() : { workflow_runs: [] }
    const run = runsJson.workflow_runs?.[0]
    return {
      ok: true,
      data: {
        repo,
        commits: commitsJson.map((c) => ({
          sha: (c.sha || '').slice(0, 7),
          message: (c.commit?.message || '').split('\n')[0],
          author: c.commit?.author?.name || c.author?.login || '—',
          date: c.commit?.author?.date || '',
        })),
        openPRs: prsJson.map((p) => ({
          number: p.number,
          title: p.title,
          user: p.user?.login || '—',
          draft: Boolean(p.draft),
        })),
        latestRun: run
          ? {
              name: run.name || 'CI',
              status: run.status,
              conclusion: run.conclusion,
              createdAt: run.created_at,
            }
          : null,
      },
    }
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export type HealthMetrics = { up: boolean; status: number; latencyMs: number; url: string }

// 服務健康（Zeabur 部署）：直接 ping app 自己的 /api/health，量延遲。免 Zeabur API token。
export async function getServiceHealth(): Promise<Panel<HealthMetrics>> {
  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base) return { ok: false, configured: false, hint: '需要 NEXT_PUBLIC_APP_URL' }
  const target = `${base.replace(/\/$/, '')}/api/health`
  const t0 = Date.now()
  try {
    const res = await fetchT(target, { cache: 'no-store' })
    return {
      ok: true,
      data: { up: res.ok, status: res.status, latencyMs: Date.now() - t0, url: base },
    }
  } catch {
    return { ok: true, data: { up: false, status: 0, latencyMs: Date.now() - t0, url: base } }
  }
}

export type SentryMetrics = {
  unresolved: number
  issues: { id: string; title: string; count: string }[]
}

export async function getSentryMetrics(): Promise<Panel<SentryMetrics>> {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org = process.env.SENTRY_ORG
  const project = process.env.SENTRY_PROJECT
  if (!token || !org || !project) {
    return {
      ok: false,
      configured: false,
      hint: '設定 SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT',
    }
  }
  const host = process.env.SENTRY_URL || 'https://sentry.io'
  try {
    const res = await fetchT(
      `${host}/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h&per_page=25`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    )
    if (!res.ok) return { ok: false, configured: true, error: `Sentry ${res.status}` }
    // biome-ignore lint/suspicious/noExplicitAny: external API JSON
    const issues: any[] = await res.json()
    // 實際未解決總數優先用 X-Hits header（issues 陣列可能被 per_page 截斷）
    const hits = Number(res.headers.get('X-Hits'))
    return {
      ok: true,
      data: {
        unresolved: Number.isFinite(hits) && hits > 0 ? hits : issues.length,
        issues: issues
          .slice(0, 5)
          .map((i) => ({ id: String(i.id), title: i.title, count: String(i.count ?? '') })),
      },
    }
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export type PosthogMetrics = { url: string }

// PostHog：分析資料在其儀表板較完整；這裡只確認已連線並提供連結（避免重做分析查詢）。
export async function getPosthogMetrics(): Promise<Panel<PosthogMetrics>> {
  const key = process.env.POSTHOG_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const host = process.env.POSTHOG_HOST || 'https://us.posthog.com'
  if (!key || !projectId) {
    return { ok: false, configured: false, hint: '設定 POSTHOG_API_KEY / POSTHOG_PROJECT_ID' }
  }
  return { ok: true, data: { url: `${host.replace(/\/$/, '')}/project/${projectId}` } }
}
