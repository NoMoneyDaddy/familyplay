/**
 * FamilyPlay 吉祥物：小熊「波波」。
 *
 * 取代原本的 🧸 emoji——emoji 跨平台長相不一、無法被設計 token 控制，也不夠品牌化。
 * 這是一隻刻意圓潤、奶油色、帶腮紅的小熊，呼應「暖色黏土」調性與「溫暖陪伴」定位。
 * 純 SVG、可隨 className 縮放、支援深淺底色（預設奶油熊，配橘色徽章底最跳）。
 */

export function Mascot({
  className = 'h-12 w-12',
  title = 'FamilyPlay 小熊',
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* 耳朵 */}
      <circle cx="18" cy="17" r="9" fill="#FFF1E6" />
      <circle cx="46" cy="17" r="9" fill="#FFF1E6" />
      <circle cx="18" cy="17" r="4.4" fill="#FFC6A0" />
      <circle cx="46" cy="17" r="4.4" fill="#FFC6A0" />
      {/* 頭 */}
      <ellipse cx="32" cy="35" rx="22" ry="20" fill="#FFF1E6" />
      {/* 腮紅 */}
      <ellipse cx="19.5" cy="40" rx="4.2" ry="3" fill="#FFB38A" opacity="0.75" />
      <ellipse cx="44.5" cy="40" rx="4.2" ry="3" fill="#FFB38A" opacity="0.75" />
      {/* 口鼻區 */}
      <ellipse cx="32" cy="40" rx="10.5" ry="8" fill="#FFE4D2" />
      {/* 眼睛 + 高光 */}
      <circle cx="24.5" cy="33" r="2.9" fill="#3A2A20" />
      <circle cx="39.5" cy="33" r="2.9" fill="#3A2A20" />
      <circle cx="25.4" cy="32.1" r="0.9" fill="#FFFFFF" />
      <circle cx="40.4" cy="32.1" r="0.9" fill="#FFFFFF" />
      {/* 鼻子 */}
      <ellipse cx="32" cy="37.5" rx="3.1" ry="2.3" fill="#3A2A20" />
      {/* 微笑 */}
      <path
        d="M32 39.6v2.1c0 2 1.7 3.4 3.7 3"
        stroke="#3A2A20"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 41.7c0 2-1.7 3.4-3.7 3"
        stroke="#3A2A20"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
