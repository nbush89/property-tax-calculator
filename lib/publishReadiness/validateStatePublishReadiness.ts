/**
 * State hub page publish readiness.
 */

import type { PublishReadinessResult, SectionAvailability, ValidationIssue } from './types'
import { getStateData } from '@/lib/geo'
import { getCountyCardHighlight } from '@/lib/metrics/resolveDisplayMetrics'
import { selectStateFeaturedTowns } from '@/lib/links/towns'
import { getStatePageFaqData } from '@/data/statePageFaqData'
import { canCalculateForState } from '@/lib/state-capabilities'
import { decisionFromScoreAndIssues, computeStrongPage } from './decide'

export function validateStatePublishReadiness(params: {
  stateSlug: string
}): PublishReadinessResult {
  const issues: ValidationIssue[] = []
  const stateSlug = params.stateSlug.toLowerCase()
  const stateData = getStateData(stateSlug)

  if (!stateData) {
    issues.push({
      code: 'STATE_NOT_RESOLVED',
      severity: 'error',
      message: `State not found: ${stateSlug}`,
    })
    return abortedState(issues, stateSlug)
  }

  const entityLabel = stateData.state.name
  const counties = stateData.counties ?? []
  const faqs = getStatePageFaqData(stateSlug)
  const featured = selectStateFeaturedTowns(stateData, { max: 10 })

  const countyCardsWithMetric = counties.filter(c => {
    const m = getCountyCardHighlight(stateSlug, c.metrics)
    return m?.show === true
  }).length

  if (counties.length === 0) {
    issues.push({
      code: 'DIRECTORY_EMPTY',
      severity: 'error',
      message: 'State has no counties in dataset — hub directory is empty',
      section: 'directory',
    })
  }

  if (!canCalculateForState(stateSlug)) {
    issues.push({
      code: 'CALCULATOR_MISSING',
      severity: 'error',
      message: 'Calculator not supported for this state configuration',
      section: 'calculator',
    })
  }

  if (faqs.length < 4) {
    issues.push({
      code: 'FAQ_TOO_SHORT',
      severity: 'warning',
      message: `State FAQ content has ${faqs.length} entries; target ≥4`,
      section: 'faq',
    })
  }

  issues.push({
    code: 'FAQ_MISSING',
    severity: 'info',
    message:
      'State hub page exposes FAQs via JSON-LD only; no visible FAQ accordion section in main content (consider adding for parity with county/town)',
    section: 'faq',
  })

  issues.push({
    code: 'METHODOLOGY_MISSING',
    severity: 'info',
    message: 'No dedicated methodology/sources section on state hub (calculator and county pages link to /methodology)',
    section: 'methodology',
  })

  const hasRatesNav = true
  const substantiveExtras =
    (countyCardsWithMetric > 0 ? 1 : 0) +
    (featured.length > 0 ? 1 : 0) +
    (hasRatesNav ? 1 : 0)

  if (substantiveExtras < 2) {
    issues.push({
      code: 'TOO_FEW_SUBSTANTIVE_SECTIONS',
      severity: 'warning',
      message: 'Limited peer comparison / exploration modules beyond county grid',
    })
  }

  if (countyCardsWithMetric === 0 && counties.length > 0) {
    issues.push({
      code: 'PRIMARY_METRIC_MISSING',
      severity: 'warning',
      message: 'No county cards resolve a highlight metric — comparison context may be weak',
      section: 'directory',
    })
  }

  const sections: SectionAvailability = {
    hero: true,
    overview: true,
    snapshot: false,
    calculator: canCalculateForState(stateSlug),
    comparison: countyCardsWithMetric >= 2,
    trend: false,
    relatedPlaces: featured.length > 0,
    estimateGuide: false,
    faq: faqs.length >= 4,
    methodology: false,
    directory: counties.length > 0,
  }

  let score = 0
  const breakdown: Record<string, number> = {}
  breakdown.entity = 20
  score += 20
  if (sections.overview) {
    breakdown.overview = 15
    score += 15
  }
  if (canCalculateForState(stateSlug)) {
    breakdown.calculator = 10
    score += 10
  }
  if (counties.length > 0) {
    breakdown.directory = 15
    score += 15
  }
  if (faqs.length >= 4) {
    breakdown.faq = 10
    score += 10
  } else {
    breakdown.faq = 4
    score += 4
  }
  breakdown.methodology = 3
  score += 3
  if (countyCardsWithMetric >= 2) {
    breakdown.comparison = 10
    score += 10
  } else if (countyCardsWithMetric === 1) {
    breakdown.comparison = 5
    score += 5
  }
  breakdown.rankingsTrend = 0
  if (featured.length > 0) {
    breakdown.rankingsTrend += 5
    score += 5
  }
  if (hasRatesNav) {
    breakdown.rankingsTrend += 5
    score += 5
  }

  const hardHold =
    !stateData || counties.length === 0 || !canCalculateForState(stateSlug)

  const decision = decisionFromScoreAndIssues(score, issues, hardHold)

  const metrics = {
    primaryMetricResolved: countyCardsWithMetric > 0,
    fallbackUsed: false,
    townLevelPrimary: false,
    trendMetricResolved: false,
    trendCountyContext: false,
    comparableMetricResolved: countyCardsWithMetric >= 2,
    sourceRefPresent: true,
  }

  const path = `/${encodeURIComponent(stateSlug)}`

  const result: PublishReadinessResult = {
    decision,
    score,
    scoreBreakdown: breakdown,
    issues,
    sections,
    metrics,
    entityType: 'state',
    entityLabel,
    strongPage: false,
    stateSlug,
    canonicalPath: path,
  }
  result.strongPage = computeStrongPage(result)
  return result
}

function abortedState(issues: ValidationIssue[], stateSlug: string): PublishReadinessResult {
  return {
    decision: 'hold',
    score: 0,
    issues,
    sections: {
      hero: false,
      overview: false,
      snapshot: false,
      calculator: false,
      comparison: false,
      trend: false,
      relatedPlaces: false,
      estimateGuide: false,
      faq: false,
      methodology: false,
      directory: false,
    },
    metrics: {
      primaryMetricResolved: false,
      fallbackUsed: false,
      townLevelPrimary: false,
      trendMetricResolved: false,
      trendCountyContext: false,
      comparableMetricResolved: false,
      sourceRefPresent: false,
    },
    entityType: 'state',
    entityLabel: stateSlug,
    strongPage: false,
    stateSlug,
  }
}
