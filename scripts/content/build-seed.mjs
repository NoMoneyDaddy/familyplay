#!/usr/bin/env node
// 內容生產線：把 typed 活動資料驗證後產生 SQL seed migration。
//
// 用法：
//   node scripts/content/build-seed.mjs activities-0-6m.mjs 20260624010000_seed_activity_library_0_6m
//
// 驗證所有欄位值落在 schema 允許集合內（enum + capability keys + 年齡 + 必填），
// 任何不合法就中止並列出問題——避免把壞資料寫進 migration / 正式環境。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')

// ── 允許集合（必須與 packages/core 及 DB CHECK 約束保持一致）──
const FOCUS = new Set(['emotional', 'fine_motor', 'gross_motor', 'language', 'social_cognitive'])
const STIM = new Set(['low', 'medium', 'high'])
const PLAY = new Set(['solitary', 'parallel', 'associative', 'cooperative'])
const SPACE = new Set(['anywhere', 'living_room', 'bedroom', 'outdoor', 'kitchen'])
const COMPANION = new Set([
  'play',
  'talk',
  'read',
  'outdoor',
  'creative',
  'sensory',
  'music',
  'calm_down',
])
const CAPS = new Set([
  'canRoll',
  'canSitUnsupported',
  'canCrawl',
  'canPullToStand',
  'canWalkIndependently',
  'canRun',
  'canJumpBothFeet',
  'canHopOneFoot',
  'canClimbStairs',
  'canGrasp',
  'canPincerGrip',
  'canStackBlocks3',
  'canScribble',
  'canDrawCircle',
  'canUseScissors',
  'canWriteName',
  'respondsToName',
  'meaningfulBabble',
  'hasVocabulary10',
  'usesTwoWordPhrases',
  'usesSentences',
  'canDescribeEvents',
  'canHaveConversation',
  'objectPermanence',
  'imitatesActions',
  'canTakeTurns',
  'symbolicPlay',
  'cooperativePlay',
  'canFollowRules',
  'selfSoothing',
  'toleratesFrustration',
])

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exitCode = 1
}

function validate(a, i) {
  const where = `#${i + 1} 「${a.title ?? '(無標題)'}」`
  const errs = []
  if (!a.title || typeof a.title !== 'string') errs.push('title 必填')
  if (!a.description) errs.push('description 必填')
  if (!a.openingLine) errs.push('openingLine 必填')
  if (!Array.isArray(a.steps) || a.steps.length === 0) errs.push('steps 至少一步')
  if (!a.endingLine) errs.push('endingLine 必填')
  if (!Number.isInteger(a.minAge) || !Number.isInteger(a.maxAge)) errs.push('age 必為整數')
  if (a.minAge < 0 || a.maxAge > 72 || a.minAge > a.maxAge)
    errs.push(`age 範圍不合理 (${a.minAge}-${a.maxAge})`)
  if (!STIM.has(a.stimulation)) errs.push(`stimulation 不合法: ${a.stimulation}`)
  if (!PLAY.has(a.playType)) errs.push(`playType 不合法: ${a.playType}`)
  if (!SPACE.has(a.space)) errs.push(`space 不合法: ${a.space}`)
  if (!COMPANION.has(a.companionType)) errs.push(`companionType 不合法: ${a.companionType}`)
  if (!Array.isArray(a.focus) || a.focus.length === 0) errs.push('focus 至少一個')
  for (const f of a.focus || []) if (!FOCUS.has(f)) errs.push(`focus 不合法: ${f}`)
  for (const key of [...(a.required || []), ...(a.optional || []), ...(a.zpd || [])]) {
    if (!CAPS.has(key)) errs.push(`capability key 不合法: ${key}`)
  }
  if (!Number.isInteger(a.minDur) || !Number.isInteger(a.maxDur) || a.minDur > a.maxDur)
    errs.push('duration 不合理')
  for (const b of ['bedtimeSafe', 'sickDaySafe', 'elderly', 'fallback'])
    if (typeof a[b] !== 'boolean') errs.push(`${b} 必為 boolean`)
  if (errs.length) fail(`${where}: ${errs.join('；')}`)
  return errs.length === 0
}

// ── SQL helpers ──
const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const qOrNull = (s) => (s == null ? 'NULL' : q(s))
const arr = (xs) => (xs && xs.length ? `'{${xs.map((x) => `"${x}"`).join(',')}}'` : `'{}'`)
const jsonbOrNull = (xs) => (xs == null ? 'NULL' : q(JSON.stringify(xs)))
const bool = (b) => (b ? 'TRUE' : 'FALSE')

function toRow(a) {
  return `(${q(a.title)}, ${q(a.description)}, ${q(a.openingLine)}, ${q(JSON.stringify(a.steps))}, ${jsonbOrNull(a.followUps)}, ${qOrNull(a.safetyNotes)}, ${q(a.endingLine)},
 ${a.minAge}, ${a.maxAge},
 ${arr(a.required)}, ${arr(a.optional)}, ${arr(a.zpd)}, ${arr(a.focus)},
 ${q(a.stimulation)}, ${q(a.playType)}, ${arr(a.resources)}, ${q(a.space)},
 ${a.minDur}, ${a.maxDur},
 ${bool(a.bedtimeSafe)}, ${bool(a.sickDaySafe)}, ${bool(a.elderly)},
 ${q(a.companionType)}, ${bool(a.fallback)}, TRUE)`
}

async function main() {
  const [dataFile, migrationName] = process.argv.slice(2)
  if (!dataFile || !migrationName) {
    console.error('用法: node build-seed.mjs <data.mjs> <migration_name>')
    process.exit(1)
  }

  const { activities } = await import(join(__dirname, dataFile))

  // 標題唯一性（批次內）
  const seen = new Set()
  for (const a of activities) {
    if (seen.has(a.title)) fail(`標題重複: ${a.title}`)
    seen.add(a.title)
  }
  activities.forEach(validate)
  if (process.exitCode === 1) {
    console.error('\n驗證未通過，未產生 migration。')
    process.exit(1)
  }

  const header = `-- ============================================================================
-- Seed（自動產生，請勿手改；改 scripts/content/${dataFile} 後重跑 build-seed.mjs）
-- 批次：${migrationName}
-- 共 ${activities.length} 筆。所有欄位值已通過 schema 允許集合驗證。
-- ============================================================================

INSERT INTO public.companion_activities (
  title, description, opening_line, steps, follow_up_questions, safety_notes, ending_line,
  min_age_months, max_age_months,
  required_capabilities, optional_capabilities, zpd_targets, developmental_focus,
  stimulation_level, play_type, required_resources, space_requirement,
  min_duration_minutes, max_duration_minutes,
  is_bedtime_safe, is_sick_day_safe, elderly_friendly,
  companion_type, is_fallback, is_active
) VALUES
`

  const sql = `${header}${activities.map(toRow).join(',\n\n')};\n`
  const outPath = join(repoRoot, 'supabase', 'migrations', `${migrationName}.sql`)
  writeFileSync(outPath, sql, 'utf8')

  // 摘要
  const byFocus = {}
  const byStim = {}
  for (const a of activities) {
    for (const f of a.focus) byFocus[f] = (byFocus[f] || 0) + 1
    byStim[a.stimulation] = (byStim[a.stimulation] || 0) + 1
  }
  console.log(`✓ 驗證通過，已寫入 ${outPath}`)
  console.log(`  ${activities.length} 筆 | focus:`, byFocus, '| stimulation:', byStim)
  console.log(
    `  bedtime-safe: ${activities.filter((a) => a.bedtimeSafe).length} | sick-day-safe: ${activities.filter((a) => a.sickDaySafe).length}`,
  )
}

main()
