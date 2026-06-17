export const COLORS = {
  brand: '#FF6B35',
  bg: '#FAFAF8',
  card: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#3ECF8E',
  warning: '#FFB347',
  info: '#4DA6FF',
  bedtimeBg: '#1A1428',
  emotionBg: '#1C1410',
} as const

export type ColorKey = keyof typeof COLORS
