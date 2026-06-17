import { describe, expect, it } from 'vitest'
import { getZpdTargets, MILESTONE_MAP } from './domains'

describe('getZpdTargets', () => {
  it('returns the next milestone for an achieved capability', () => {
    // canRoll → canSitUnsupported (per the milestone chain)
    expect(getZpdTargets(['canRoll'])).toContain('canSitUnsupported')
  })

  it('does not target a milestone the child has already achieved', () => {
    const zpd = getZpdTargets(['canRoll', 'canSitUnsupported'])
    expect(zpd).not.toContain('canSitUnsupported')
    expect(zpd).toContain('canCrawl') // the next edge surfaces instead
  })

  it('de-duplicates convergent next milestones', () => {
    // canRun and canClimbStairs both point to canJumpBothFeet
    const zpd = getZpdTargets(['canRun', 'canClimbStairs'])
    expect(zpd.filter((k) => k === 'canJumpBothFeet')).toHaveLength(1)
  })

  it('returns an empty array for no achieved capabilities', () => {
    expect(getZpdTargets([])).toEqual([])
  })
})

describe('MILESTONE_MAP', () => {
  it('indexes every milestone by its key', () => {
    expect(MILESTONE_MAP.get('canRoll')?.nextMilestone).toBe('canSitUnsupported')
  })
})
