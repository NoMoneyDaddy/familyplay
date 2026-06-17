export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-xl font-bold text-text">目前離線</h1>
      <p className="text-sm text-muted">網路連線中斷了。請檢查連線後重試，已快取的頁面仍可瀏覽。</p>
    </main>
  )
}
