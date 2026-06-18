import { PageShell } from '@/app/components/ui'

// admin 是 server component，會並行打 5 個查詢；給串流 fallback，避免整頁卡白。
export default function AdminLoading() {
  return (
    <PageShell>
      <div className="flex items-center justify-center py-20" aria-busy="true" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <span className="sr-only">載入儀表板中</span>
      </div>
    </PageShell>
  )
}
