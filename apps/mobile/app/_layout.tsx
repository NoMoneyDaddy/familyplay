import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { RevenueCatError, initializeRevenueCat, onPurchaseComplete } from '~/lib/revenue-cat'
import { useSubscriptionStore } from '~/lib/stores/useSubscriptionStore'

export default function RootLayout() {
  const { session } = useAuthStore()
  const user = session?.user
  const { setIsLoading, setError, setPlan, setRevenuecatCustomerId, setPlusEndsAt } =
    useSubscriptionStore()

  // Initialize RevenueCat when user is authenticated
  useEffect(() => {
    const initRC = async () => {
      if (!user?.id) {
        return
      }

      try {
        setIsLoading(true)
        await initializeRevenueCat(user.id)
      } catch (err: unknown) {
        const message =
          err instanceof RevenueCatError ? err.message : 'Failed to initialize payments'
        console.error('[App] RevenueCat init error:', message)
        setError(message)
        // Don't block app, just log
      } finally {
        setIsLoading(false)
      }
    }

    initRC()
  }, [user?.id, setIsLoading, setError])

  // Set up purchase completion listener
  useEffect(() => {
    onPurchaseComplete(async (event) => {
      try {
        setIsLoading(true)

        // Call backend to validate and update entitlements
        const response = await fetch('/api/mobile-purchase-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.id}`,
          },
          body: JSON.stringify({
            revenuecatCustomerId: event.customerId,
            authUserId: user?.id,
            transactionId: event.transactionId,
            productId: event.productId,
            purchaseDate: event.purchaseDate,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to validate purchase: HTTP ${response.status}`)
        }

        const result = (await response.json()) as {
          plan: string
          plusEndsAt?: string
          revenuecatCustomerId: string
        }

        // Update subscription store
        setPlan(result.plan)
        setRevenuecatCustomerId(result.revenuecatCustomerId)
        if (result.plusEndsAt) {
          setPlusEndsAt(new Date(result.plusEndsAt))
        }

        Alert.alert('Success', 'Your subscription has been activated!')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Purchase validation failed'
        console.error('[App] Purchase validation error:', message)
        setError(message)
        Alert.alert('Error', message)
      } finally {
        setIsLoading(false)
      }
    })
  }, [user?.id, setIsLoading, setError, setPlan, setRevenuecatCustomerId, setPlusEndsAt])

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
