'use client'

import { useMutation } from '@tanstack/react-query'
import { fetchRecommendations } from './client'
import type { RecommendRequestBody } from './companion-store'

export function useRecommendations() {
  return useMutation({
    mutationFn: (body: RecommendRequestBody) => fetchRecommendations(body),
  })
}
