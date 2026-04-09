/**
 * CTR opportunity scoring for Search Console landing pages.
 * Tune thresholds here; keep publish readiness separate.
 */

import type { CtrOpportunityLevel, SeoEntityType } from './types'

export type CtrOpportunityResult = {
  level: CtrOpportunityLevel
  /** Higher = more urgent (sort desc) */
  priorityScore: number
  reasons: string[]
  /** Expected CTR at this average position using a conservative informational-query curve */
  expectedCtr: number
  /**
   * Ratio of actual CTR / expected CTR.
   * < 0.7  → meaningfully below expected — title/meta work likely worth it.
   * 0.7–1.0 → slightly below — monitor.
   * ≥ 1.0  → at or above expected for position — ranking improvement is the lever, not copy.
   * null when impressions are too thin to trust.
   */
  ctrVsExpected: number | null
}

export type CtrOpportunityInput = {
  impressions: number
  clicks: number
  ctr: number
  averagePosition: number
  /** When false, user asked to de-prioritize held / not effectively published pages */
  effectivelyPublished?: boolean
  entityType?: SeoEntityType
}

/**
 * Conservative CTR curve for niche informational/tool queries (property tax calculators).
 * Deliberately lower than general-web averages: these SERPs often have featured snippets,
 * local packs, and government sites that absorb clicks before the organic list.
 *
 * Source: adjusted from Sistrix/Backlinko industry studies with ~30% downward correction
 * for tool-type queries. Recalibrate once you have 6+ months of GSC data.
 */
export function expectedCtrForPosition(position: number): number {
  if (position <= 1) return 0.22
  if (position <= 2) return 0.12
  if (position <= 3) return 0.08
  if (position <= 4) return 0.06
  if (position <= 5) return 0.045
  if (position <= 6) return 0.035
  if (position <= 7) return 0.028
  if (position <= 8) return 0.023
  if (position <= 9) return 0.019
  if (position <= 10) return 0.016
  if (position <= 15) return 0.010
  if (position <= 20) return 0.007
  if (position <= 30) return 0.004
  return 0.002
}

/**
 * v1 rules:
 * - high: impressions >= 100, ctr < 0.02, position <= 20
 * - medium: impressions >= 50, ctr < 0.03, position <= 30
 * - low: some impressions but weaker signals
 * - none: thin data or healthy CTR
 */
export function computeCtrOpportunity(input: CtrOpportunityInput): CtrOpportunityResult {
  const { impressions, ctr, averagePosition } = input
  const reasons: string[] = []
  let level: CtrOpportunityLevel = 'none'
  let baseScore = 0

  if (impressions >= 100 && ctr < 0.02 && averagePosition <= 20) {
    level = 'high'
    baseScore = 100 + Math.min(impressions / 10, 80) + Math.max(0, 20 - averagePosition)
    reasons.push('High impressions with CTR under 2% and position in top 20')
  } else if (impressions >= 50 && ctr < 0.03 && averagePosition <= 30) {
    level = 'medium'
    baseScore = 60 + Math.min(impressions / 15, 40) + Math.max(0, 15 - averagePosition / 2)
    reasons.push('Moderate impressions with CTR under 3% and position in top 30')
  } else if (impressions >= 20 && ctr < 0.04) {
    level = 'low'
    baseScore = 25 + impressions / 20
    reasons.push('Some visibility; CTR could be improved')
  } else if (impressions >= 10 && ctr < 0.05) {
    level = 'low'
    baseScore = 15
    reasons.push('Early data — monitor or test title/meta')
  } else if (impressions < 10) {
    return {
      level: 'none',
      priorityScore: 0,
      reasons: ['Not enough impressions to prioritize'],
      expectedCtr: expectedCtrForPosition(averagePosition),
      ctrVsExpected: null,
    }
  } else {
    return {
      level: 'none',
      priorityScore: Math.min(10, impressions / 50),
      reasons: ['CTR looks healthy for current volume or position is deep'],
      expectedCtr: expectedCtrForPosition(averagePosition),
      ctrVsExpected: impressions >= 20 ? Math.round((ctr / expectedCtrForPosition(averagePosition)) * 100) / 100 : null,
    }
  }

  if (input.entityType === 'town') {
    baseScore += 5
    reasons.push('Town pages often benefit from locality-specific titles')
  }

  if (input.effectivelyPublished === false) {
    baseScore *= 0.35
    reasons.push('Publish/effective status not “live” — fix indexing before CTR work')
  }

  const expectedCtr = expectedCtrForPosition(averagePosition)
  // Only surface ratio when we have enough impressions to trust the CTR figure
  const ctrVsExpected = impressions >= 20 && expectedCtr > 0
    ? Math.round((ctr / expectedCtr) * 100) / 100
    : null

  if (ctrVsExpected !== null && ctrVsExpected < 0.7) {
    reasons.push(
      `CTR is ${Math.round((1 - ctrVsExpected) * 100)}% below expected for position ${Math.round(averagePosition)} — title/meta copy is the likely lever`
    )
  }

  return {
    level,
    priorityScore: Math.round(baseScore * 10) / 10,
    reasons,
    expectedCtr,
    ctrVsExpected,
  }
}
