import { LinkButton } from '@/app/components/ui'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🧭</div>
      <h1 className="text-xl font-bold text-text">找不到這個頁面</h1>
      <p className="text-sm text-muted">你要找的內容可能已移動或不存在。</p>
      <LinkButton href="/" size="md" icon="home">
        回首頁
      </LinkButton>
    </main>
  )
}
