// 結構化資料（JSON-LD / schema.org）：讓搜尋引擎與 AI/LLM 正確理解
// 「FamilyPlay 是什麼、給誰、做什麼」。全為靜態自有內容（無使用者輸入），
// 故用 <script> 的字串 children 渲染，避免 dangerouslySetInnerHTML（符合 CLAUDE.md）。
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://familyplay.nomoneydaddy.app'

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'FamilyPlay',
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description: '給疲憊家長的親子陪伴導航 App。',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'FamilyPlay',
      inLanguage: 'zh-Hant-TW',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'FamilyPlay',
      url: SITE_URL,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: 'zh-Hant-TW',
      description:
        '給疲憊家長的親子陪伴導航：選當下狀態，30 秒拿到可立即執行的陪伴方案。涵蓋 0–5 歲九個發展階段，依孩子發展里程碑（ZPD）推薦活動。',
      audience: { '@type': 'Audience', audienceType: '0–5 歲幼兒的家長與照顧者' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

export function StructuredData() {
  return <script type="application/ld+json">{JSON.stringify(graph)}</script>
}
