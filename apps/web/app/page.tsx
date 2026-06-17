import { AuthButton } from '@/components/auth-button'
import { CompanionFlow } from '@/components/companion-flow'

export default function HomePage() {
  return (
    <main className="px-5 py-8">
      <div className="mb-4 flex justify-end">
        <AuthButton />
      </div>
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-[--color-brand]">FamilyPlay</h1>
        <p className="text-[--color-muted]">30 秒找到今天的陪伴方式</p>
      </header>
      <CompanionFlow />
    </main>
  )
}
