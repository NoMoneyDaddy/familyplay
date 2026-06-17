export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <span className="sr-only">載入中</span>
    </main>
  )
}
