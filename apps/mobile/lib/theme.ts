/**
 * 行動端設計 token — 與 web（apps/web/app/globals.css @theme）同一套暖色系，
 * 讓全平台調性一致。新畫面請從這裡取色，不要再散用冷灰 hex。
 */
export const colors = {
  brand: '#FF6B35',
  brandStrong: '#E8551F',
  brandTint: '#FFF1EA',
  brandTintStrong: '#FFE2D2',

  bg: '#FAF6F0', // 暖奶油
  surface: '#FFFDFB',
  card: '#FFFFFF',

  text: '#241F1B', // 暖墨黑
  muted: '#6B615A', // 暖灰（AA 安全）
  faint: '#9B9089',
  border: '#ECE5DB',
  borderStrong: '#DDD2C5',

  success: '#1B7A4E',
  successTint: '#E7F3EC',
  warning: '#9A5400',
  warningTint: '#FBEED9',
  danger: '#B42318',
  dangerTint: '#FDECEA',
  info: '#1D6FA5',
  infoTint: '#E8F1F8',
} as const

/** 與 web 一致的圓角分級（黏土調性偏圓潤）。 */
export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
} as const

/** 黏土卡片陰影（暖色、柔和）—— RN style 物件，給卡片/徽章共用，避免各畫面重複定義。 */
export const clayCard = {
  shadowColor: '#4A311C',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 6,
} as const

/** 品牌漸層（上淺下深），給 expo-linear-gradient 的 colors 用。 */
export const brandGradient = ['#FF8A5C', '#FF6B35', '#E8551F'] as const

export type ColorToken = keyof typeof colors
