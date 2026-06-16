import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FAFAF8' },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FAFAF8' },
        }}
      />
      <StatusBar style="dark" />
    </>
  )
}
