import { createClient } from '@supabase/supabase-js'

// 所有 fetch 都 no-store（即時、不快取）。每個來源未設定金鑰時回 { configured: false }，
// 讓 dashboard 以「dormant until configured」方式呈現，與 ads/push 一致。

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
      fetch(`${base}/commits?sha=main&per_page=5`, { headers, cache: 'no-store' }),
      fetch(`${base}/pulls?state=open&per_page=10`, { headers, cache: 'no-store' }),
      fetch(`${base}/actions/runs?branch=main&per_page=1`, { headers, cache: 'no-store' }),
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
    const res = await fetch(target, { cache: 'no-store' })
    return {
      ok: true,
      data: { up: res.ok, status: res.status, latencyMs: Date.now() - t0, url: base },
    }
  } catch {
    return { ok: true, data: { up: false, status: 0, latencyMs: Date.now() - t0, url: base } }
  }
}

export type SentryMetrics = { unresolved: number; issues: { title: string; count: string }[] }

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
    const res = await fetch(
      `${host}/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h&per_page=10`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    )
    if (!res.ok) return { ok: false, configured: true, error: `Sentry ${res.status}` }
    // biome-ignore lint/suspicious/noExplicitAny: external API JSON
    const issues: any[] = await res.json()
    return {
      ok: true,
      data: {
        unresolved: issues.length,
        issues: issues.slice(0, 5).map((i) => ({ title: i.title, count: String(i.count ?? '') })),
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
