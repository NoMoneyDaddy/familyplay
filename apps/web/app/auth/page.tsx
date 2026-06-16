import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AuthPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )

  const { data } = await supabase.auth.getSession()
  if (data.session) {
    redirect('/select')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-brand] to-[--color-bg] px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-8 pt-20">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold text-white">FamilyPlay</h1>
          <p className="text-white/80">30 秒找到今天的陪伴方式</p>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-8 shadow-lg">
          <p className="text-center font-semibold text-[--color-text]">選擇登入方式</p>

          <form action="/api/auth/google" method="POST">
            <button
              type="submit"
              className="w-full rounded-lg border-2 border-[--color-border] py-4 text-center font-semibold text-[--color-text] transition-all hover:border-[--color-brand]"
            >
              🔐 用 Google 帳號登入
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[--color-border]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[--color-muted]">或</span>
            </div>
          </div>

          <form action="/api/auth/email" method="POST" className="space-y-3">
            <input
              type="email"
              name="email"
              placeholder="你的 email"
              required
              className="w-full rounded-lg border border-[--color-border] px-4 py-2 text-[--color-text]"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[--color-brand] py-3 font-semibold text-white"
            >
              📧 用 Email 登入
            </button>
          </form>

          <p className="text-center text-xs text-[--color-muted]">首次登入時會自動建立帳號</p>
        </div>

        <p className="text-center text-xs text-white/60">你的資料使用 Supabase 安全保護</p>
      </div>
    </main>
  )
}
