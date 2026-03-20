/**
 * Map numeric score + severities to PublishDecision and strongPage.
 */

import type { PublishDecision, PublishReadinessResult, ValidationIssue } from './types'

const PUBLISH_MIN = 90
const WARN_MIN = 75

export function decisionFromScoreAndIssues(
  score: number,
  issues: ValidationIssue[],
  hardHold: boolean
): PublishDecision {
  if (hardHold) return 'hold'
  const hasError = issues.some(i => i.severity === 'error')
  if (hasError) return 'hold'
  if (score >= PUBLISH_MIN) return 'publish'
  if (score >= WARN_MIN) return 'publish_with_warnings'
  return 'hold'
}

/**
 * Confident rollout — criteria vary by entity:
 * - Town: publish, no warn/error, score≥92, town-level primary, no county snapshot/trend fallback
 * - County: publish, no warn/error, score≥92, hero metric + sourceRef on hero point
 * - State: publish, no warn/error, score≥92, non-empty directory
 */
export function computeStrongPage(result: PublishReadinessResult): boolean {
  if (result.decision !== 'publish') return false
  if (result.issues.some(i => i.severity === 'error' || i.severity === 'warning')) return false
  if (result.score < 92) return false

  if (result.entityType === 'town') {
    if (result.metrics.fallbackUsed || result.metrics.trendCountyContext) return false
    if (!result.metrics.primaryMetricResolved || !result.metrics.townLevelPrimary) return false
    return true
  }

  if (result.entityType === 'county') {
    return result.metrics.primaryMetricResolved && result.metrics.sourceRefPresent
  }

  if (result.entityType === 'state') {
    return result.sections.directory === true
  }

  return false
}
