import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { createMobileClient } from '@/lib/supabase/mobile'

export default function CallbackScreen() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = await Linking.getInitialURL()

        if (url == null) {
          router.replace('/auth/login')
          return
        }

        if (url.includes('#')) {
          const supabase = createMobileClient()
          const { data, error } = await supabase.auth.getSession()

          if (error || !data.session) {
            console.error('Callback error:', error)
            router.replace('/auth/login')
            return
          }

          router.replace('/onboarding/child-info')
        } else {
          router.replace('/auth/login')
        }
      } catch (err) {
        console.error('Callback handling error:', err)
        router.replace('/auth/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  )
}
