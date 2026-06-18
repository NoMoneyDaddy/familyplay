import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '@/lib/stores/useAuthStore'

export default function RootLayout() {
  const { session } = useAuthStore()

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FAF6F0' },
          headerTintColor: '#241F1B',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FAF6F0' },
        }}
      />
      <StatusBar style="dark" />
    </>
  )
}
