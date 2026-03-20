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
    return { level: 'none', priorityScore: 0, reasons: ['Not enough impressions to prioritize'] }
  } else {
    return {
      level: 'none',
      priorityScore: Math.min(10, impressions / 50),
      reasons: ['CTR looks healthy for current volume or position is deep'],
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

  return { level, priorityScore: Math.round(baseScore * 10) / 10, reasons }
}
