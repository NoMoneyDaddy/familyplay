// Tailwind CSS v4 在 Next.js（webpack 生產建置）需要這個 PostCSS plugin 才會編譯
// `@import "tailwindcss"` 與 @theme/utilities。缺少時 production `next build` 不會
// 產生任何 utility class（只剩 next/font 的 @font-face），畫面退化成無樣式的「白紙」。
// dev（Turbopack）會隱式處理 Tailwind，所以這個 bug 只在正式部署顯現。
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
