import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { createMobileClient } from '@/lib/supabase/mobile'
import { useAuthStore } from '@/lib/stores/useAuthStore'

WebBrowser.maybeCompleteAuthSession()

const linking = {
  prefixes: ['familyplay://', 'exp+familyplay://'],
  config: {
    screens: {
      auth: 'auth',
      onboarding: 'onboarding',
      select: 'select',
      _sitemap: '*',
    },
  },
}

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const { session, isLoading, setSession, setIsLoading } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = createMobileClient()
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth error:', error)
          setSession(null)
        } else {
          setSession(data.session)
        }
      } catch (err) {
        console.error('Init auth error:', err)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [setSession, setIsLoading])

  useEffect(() => {
    const unsubscribe = createMobileClient().auth.onAuthStateChange((event, session) => {
      setSession(session)
    })

    return () => {
      unsubscribe.data?.subscription?.unsubscribe()
    }
  }, [setSession])

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const deepLink = url.replace(/.*?:\/\//g, '')
      const routeName = deepLink.split('/').filter(Boolean)[0]

      if (routeName === 'auth' && deepLink.includes('callback')) {
        router.push('/auth/callback')
      }
    })

    return () => {
      subscription.remove()
    }
  }, [router])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAF8]">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  const inAuthGroup = segments[0] === 'auth'

  useEffect(() => {
    if (!session && !inAuthGroup) {
      router.replace('/auth/login')
    } else if (session && inAuthGroup) {
      router.replace('/onboarding/child-info')
    }
  }, [session, inAuthGroup, router])

  return (
    <>
      <Stack
        linking={linking}
        screenOptions={{
          headerStyle: { backgroundColor: '#FAFAF8' },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FAFAF8' },
        }}
      >
        <Stack.Group screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
        </Stack.Group>

        <Stack.Group>
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
            }}
          />
        </Stack.Group>

        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="select" options={{ title: '選擇孩子' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  )
}
