import type { SupabaseClient } from '@supabase/supabase-js'

// 贊助小卡（house ads / 跨promo）：免費用戶可見的輕量贊助內容，Supporter/Plus 去廣告即隱藏。
// RLS（anyone_read_active_ads）已限定只回「啟用中且在時間窗內」的卡；此層再依版位過濾。
// 跨平台共用：Web 與行動端各自帶 session（或匿名）的 client。

export class SponsorError extends Error {}

export interface SponsorCard {
  id: string
  title: string
  body: string
  ctaText: string | null
  ctaUrl: string | null
}

export interface SponsorRow {
  id: string
  title: string
  body: string
  cta_text: string | null
  cta_url: string | null
  allowed_placements: string[] | null
}

/** DB 列 → SponsorCard。抽出以便單元測試。 */
export function mapSponsorRow(row: SponsorRow): SponsorCard {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
  }
}

/**
 * 某版位（placement）目前可顯示的贊助小卡。
 * 規則：allowed_placements 為空 = 不限版位（到處可顯示）；否則需包含該 placement。
 * RLS 已過濾啟用/時間窗，這裡只做版位篩選並限量。
 */
export async function fetchActiveSponsorCards(
  supabase: SupabaseClient,
  placement: string,
  limit = 3,
): Promise<SponsorCard[]> {
  const { data, error } = await supabase
    .from('sponsor_cards')
    .select('id,title,body,cta_text,cta_url,allowed_placements')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new SponsorError('無法載入贊助內容')
  return ((data || []) as SponsorRow[])
    .filter((r) => {
      const placements = r.allowed_placements || []
      return placements.length === 0 || placements.includes(placement)
    })
    .slice(0, limit)
    .map(mapSponsorRow)
}
