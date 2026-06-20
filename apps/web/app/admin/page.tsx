import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, Icon, type IconName, PageHeader, PageShell } from '@/app/components/ui'
import { getAdminEmail } from '@/lib/admin/access'
import {
  getGithubMetrics,
  getPosthogMetrics,
  getSentryMetrics,
  getServiceHealth,
  getSupabaseMetrics,
  type Panel,
} from '@/lib/admin/metrics'
import { AutoRefresh } from './auto-refresh'

// 即時、不快取：每次開啟（與 AutoRefresh 觸發的 router.refresh）都重抓資料。
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: '營運儀表板 · FamilyPlay', robots: { index: false } }

const FOCUS_LABEL: Record<string, string> = {
  gross_motor: '大動作',
  fine_motor: '精細動作',
  language: '語言',
  social_cognitive: '社交認知',
  emotional: '情緒',
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: IconName
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-clay-sm">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint">
        <Icon name={icon} className="h-[16px] w-[16px] text-brand" aria-hidden="true" />
      </span>
      <p className="mt-2 font-display text-2xl font-bold leading-none tabular-nums text-text">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: IconName
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-tint">
          <Icon name={icon} className="h-[15px] w-[15px] text-brand" aria-hidden="true" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

// 共用：未設定 / 錯誤的提示卡
function PanelFallback<T>({ panel }: { panel: Panel<T> }) {
  if (panel.ok) return null
  return (
    <Card className="flex items-start gap-2.5 text-sm">
      {panel.configured ? (
        <>
          <Icon
            name="alert"
            className="mt-0.5 h-[16px] w-[16px] shrink-0 text-danger"
            aria-hidden="true"
          />
          <p className="text-danger">讀取失敗：{panel.error}</p>
        </>
      ) : (
        <>
          <Icon
            name="info"
            className="mt-0.5 h-[16px] w-[16px] shrink-0 text-faint"
            aria-hidden="true"
          />
          <p className="text-muted">尚未連線 — {panel.hint}</p>
        </>
      )}
    </Card>
  )
}

function fmtTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function AdminDashboardPage() {
  // 管理員把關：非白名單一律 404（不洩漏此頁存在）
  const adminEmail = await getAdminEmail()
  if (!adminEmail) notFound()

  const [supabase, github, health, sentry, posthog] = await Promise.all([
    getSupabaseMetrics(),
    getGithubMetrics(),
    getServiceHealth(),
    getSentryMetrics(),
    getPosthogMetrics(),
  ])

  return (
    <PageShell withNav={false} className="space-y-7">
      <PageHeader title="營運儀表板" subtitle={`${adminEmail}`} action={<AutoRefresh />} />

      {/* ── Supabase：App 即時指標 ── */}
      <Section title="App 指標（Supabase）" icon="chart">
        {supabase.ok ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="使用者" value={supabase.data.users} icon="user" />
              <StatTile label="孩子" value={supabase.data.children} icon="child" />
              <StatTile label="家庭" value={supabase.data.households} icon="family" />
              <StatTile label="今日陪伴" value={supabase.data.logs_today} icon="heart" />
              <StatTile label="近 7 天" value={supabase.data.logs_7d} icon="history" />
              <StatTile label="陪伴總數" value={supabase.data.logs_total} icon="check" />
              <StatTile label="提醒訂閱" value={supabase.data.reminder_subs} icon="moon" />
              <StatTile label="活動庫" value={supabase.data.active_activities} icon="book" />
              <StatTile
                label="付費（S/P）"
                value={(supabase.data.plans.supporter || 0) + (supabase.data.plans.plus || 0)}
                icon="card"
              />
            </div>

            <Card className="space-y-2">
              <p className="text-xs font-semibold text-muted">活動庫發展領域分布</p>
              {Object.entries(supabase.data.activities_by_focus)
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => {
                  const total = supabase.data.active_activities || 1
                  return (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span className="w-16 shrink-0 text-text">{FOCUS_LABEL[k] ?? k}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                        <div
                          className="h-full bg-[image:var(--gradient-brand)]"
                          style={{ width: `${Math.round((n / total) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-muted">{n}</span>
                    </div>
                  )
                })}
            </Card>

            <Card className="space-y-1.5">
              <p className="text-xs font-semibold text-muted">最近陪伴紀錄</p>
              {supabase.data.recent_logs.length === 0 ? (
                <p className="text-xs text-faint">尚無紀錄</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {supabase.data.recent_logs.map((log) => (
                    <li
                      key={`${log.created_at}-${log.title}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-text">{log.title}</span>
                      <span className="shrink-0 text-faint">{fmtTime(log.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ) : (
          <PanelFallback panel={supabase} />
        )}
      </Section>

      {/* ── 服務健康（Zeabur 部署）── */}
      <Section title="服務健康（Zeabur）" icon="compass">
        {health.ok ? (
          <Card className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${health.data.up ? 'bg-success' : 'bg-danger'}`}
              />
              <span className="text-sm font-medium text-text">
                {health.data.up ? '運作中' : '無回應'}
              </span>
              <span className="text-xs text-muted">
                {health.data.status} · {health.data.latencyMs}ms
              </span>
            </div>
            <a
              href={health.data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              開啟網站
              <Icon name="link" className="h-[13px] w-[13px]" aria-hidden="true" />
            </a>
          </Card>
        ) : (
          <PanelFallback panel={health} />
        )}
      </Section>

      {/* ── GitHub ── */}
      <Section title="GitHub" icon="settings">
        {github.ok ? (
          <div className="space-y-3">
            <Card className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">最新 CI（main）</span>
                {github.data.latestRun ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      github.data.latestRun.conclusion === 'success'
                        ? 'bg-success-tint text-success'
                        : github.data.latestRun.conclusion === 'failure'
                          ? 'bg-danger-tint text-danger'
                          : 'bg-info-tint text-info'
                    }`}
                  >
                    {github.data.latestRun.conclusion || github.data.latestRun.status}
                  </span>
                ) : (
                  <span className="text-xs text-faint">—</span>
                )}
              </div>
            </Card>

            <Card className="space-y-1.5">
              <p className="text-xs font-semibold text-muted">
                開啟中的 PR（{github.data.openPRs.length}）
              </p>
              {github.data.openPRs.length === 0 ? (
                <p className="text-xs text-faint">沒有開啟的 PR</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {github.data.openPRs.map((pr) => (
                    <li key={pr.number} className="flex items-start gap-1.5">
                      <span className="shrink-0 text-faint">#{pr.number}</span>
                      <span className="truncate text-text">
                        {pr.draft && <span className="text-faint">[草稿] </span>}
                        {pr.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-1.5">
              <p className="text-xs font-semibold text-muted">最近 commits</p>
              <ul className="space-y-1 text-xs">
                {github.data.commits.map((c) => (
                  <li key={c.sha} className="flex items-start gap-1.5">
                    <span className="shrink-0 font-mono text-faint">{c.sha}</span>
                    <span className="truncate text-text">{c.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : (
          <PanelFallback panel={github} />
        )}
      </Section>

      {/* ── 監控（Sentry / PostHog）── */}
      <Section title="監控（Sentry / PostHog）" icon="alert">
        {sentry.ok ? (
          <Card className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Sentry · 未解決（24h）</span>
              <span
                className={`font-display text-lg font-bold ${sentry.data.unresolved > 0 ? 'text-danger' : 'text-success'}`}
              >
                {sentry.data.unresolved}
              </span>
            </div>
            {sentry.data.issues.map((i) => (
              <p key={i.id} className="truncate text-xs text-muted">
                {i.title}
              </p>
            ))}
          </Card>
        ) : (
          <PanelFallback panel={sentry} />
        )}

        {posthog.ok ? (
          <Card className="flex items-center justify-between">
            <span className="text-sm text-text">PostHog 分析</span>
            <a
              href={posthog.data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              開啟儀表板
              <Icon name="link" className="h-[13px] w-[13px]" aria-hidden="true" />
            </a>
          </Card>
        ) : (
          <PanelFallback panel={posthog} />
        )}
      </Section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-faint">
        <Icon name="lock" className="h-[13px] w-[13px]" aria-hidden="true" />
        僅限管理員 · 資料即時讀取，不另外快取
      </p>
    </PageShell>
  )
}
