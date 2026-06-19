import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
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

  // 未登入：直接帶到「免費試用」（不強制登入、先給價值）；要保存/記錄再從那裡登入。
  if (!data.session) {
    redirect('/try')
  }

  const { data: children } = await supabase.from('child_profiles').select('id').limit(1)

  if (!children || children.length === 0) {
    redirect('/onboarding')
  }

  // 全傻瓜入口：直接到「現在就陪」一鍵頁（一個答案 + 換一個 + 一鍵記錄）。
  // 想自己挑年齡/精力/情境，可從那裡進 /select。
  redirect('/now')
}
