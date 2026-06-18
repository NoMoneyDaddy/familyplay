import { Mascot } from '@/app/components/mascot'
import { LinkButton } from '@/app/components/ui'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-brand-tint shadow-clay">
        <Mascot className="h-16 w-16" />
      </span>
      <h1 className="text-xl font-bold text-text">找不到這個頁面</h1>
      <p className="text-sm text-muted">你要找的內容可能已移動或不存在。</p>
      <LinkButton href="/" size="md" icon="home">
        回首頁
      </LinkButton>
    </main>
  )
}
