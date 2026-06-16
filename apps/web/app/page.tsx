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

  if (!data.session) {
    redirect('/auth')
  }

  const { data: children } = await supabase.from('child_profiles').select('id').limit(1)

  if (!children || children.length === 0) {
    redirect('/onboarding')
  }

  redirect('/select')
}
