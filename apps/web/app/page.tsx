// Sprint 1 骨架首頁 — 完整 UI 在 Sprint 3 實作

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-8">
      <div className="w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[--color-brand]">FamilyPlay</h1>
          <p className="text-[--color-muted]">30 秒找到今天的陪伴方式</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-[--color-border] text-left space-y-4">
          <p className="text-sm text-[--color-muted]">示範引導卡</p>
          <h2 className="text-xl font-semibold">問你一件今天的事</h2>
          <p className="text-2xl font-bold text-[--color-brand]">
            你今天有什麼讓你開心的事嗎？
          </p>
          <div className="flex gap-2 text-sm text-[--color-muted]">
            <span>5–10 分鐘</span>
            <span>·</span>
            <span>隨時隨地</span>
          </div>
        </div>

        <button
          className="w-full rounded-xl bg-[--color-brand] py-4 text-lg font-bold text-white transition-transform active:scale-[0.97]"
          aria-label="快給我一個陪伴方案"
        >
          🧡 快給我一個
        </button>

        <p className="text-xs text-[--color-muted]">
          Sprint 1 骨架 — 完整功能 Sprint 3 上線
        </p>
      </div>
    </main>
  )
}
