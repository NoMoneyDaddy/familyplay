import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🧭</div>
      <h1 className="text-xl font-bold text-[--color-text]">找不到這個頁面</h1>
      <p className="text-sm text-[--color-muted]">你要找的內容可能已移動或不存在。</p>
      <Link
        href="/"
        className="rounded-lg bg-[--color-brand] px-5 py-2.5 font-medium text-white hover:opacity-90"
      >
        回首頁
      </Link>
    </main>
  )
}
