/**
 * County page publish readiness.
 */

import type { CountyData, StateData } from '@/lib/data/types'
import type { PublishReadinessResult, SectionAvailability, ValidationIssue } from './types'
import { getStateData, getCountyBySlug } from '@/lib/geo'
import { resolveCountyPageContent } from '@/lib/content/countyContent'
import { getCountyFaqData } from '@/data/countyFaqData'
import { canCalculateForState, getStateCapabilities } from '@/lib/state-capabilities'
import { shouldShowCountyAverageTaxBillTrend } from '@/lib/metrics/resolveDisplayMetrics'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { getTownSlug, selectFeaturedTowns } from '@/lib/links/towns'
import { computeYoYStats } from '@/lib/data/metrics'
import { slugifyLocation } from '@/utils/locationUtils'
import { decisionFromScoreAndIssues, computeStrongPage } from './decide'

function normalizeCountySlug(raw: string): string {
  return raw.replace(/-county-property-tax$/i, '').toLowerCase()
}

function countyTrendRenders(stateSlug: string, county: CountyData): boolean {
  if (!shouldShowCountyAverageTaxBillTrend(stateSlug)) return false
  const series = county.metrics?.averageResidentialTaxBill ?? []
  if (series.length < 2) return false
  const sorted = [...series].sort((a, b) => a.year - b.year)
  return computeYoYStats(sorted) != null
}

export function validateCountyPublishReadiness(params: {
  stateSlug: string
  countySlug: string
  stateData?: StateData | null
}): PublishReadinessResult {
  const issues: ValidationIssue[] = []
  const stateSlug = params.stateSlug.toLowerCase()
  const stateData = params.stateData ?? getStateData(stateSlug)
  const normCounty = normalizeCountySlug(params.countySlug)

  if (!stateData) {
    issues.push({
      code: 'STATE_NOT_RESOLVED',
      severity: 'error',
      message: `State not found: ${stateSlug}`,
    })
    return abortedCounty(issues, normCounty, stateSlug)
  }

  const county = getCountyBySlug(stateData, normCounty)
  if (!county) {
    issues.push({
      code: 'COUNTY_NOT_RESOLVED',
      severity: 'error',
      message: `County slug did not resolve: ${params.countySlug}`,
    })
    return abortedCounty(issues, normCounty, stateSlug)
  }

  const entityLabel = `${county.name} County, ${stateData.state.name}`
  const { content, countyHero } = resolveCountyPageContent({
    stateSlug,
    stateData,
    county,
  })
  const cap = getStateCapabilities(stateSlug)
  const faqs = getCountyFaqData(county.name, stateSlug)
  const publishedTownCount = (county.towns ?? []).filter(
    t => getTownSlug(t) && isTownPublished(t)
  ).length
  const sluggableTownCount = (county.towns ?? []).filter(t => getTownSlug(t)).length
  const featured = selectFeaturedTowns(county, { max: 8, stateSlug })
  const trendOk = countyTrendRenders(stateSlug, county)

  if (!countyHero?.show) {
    issues.push({
      code: 'SNAPSHOT_MISSING',
      severity: 'error',
      message: 'County hero metric does not resolve (no supported primary metric with data)',
      section: 'snapshot',
    })
  }

  if (!canCalculateForState(stateSlug)) {
    issues.push({
      code: 'CALCULATOR_MISSING',
      severity: 'error',
      message: 'Calculator not supported for this state',
      section: 'calculator',
    })
  }

  if (cap.hasTownPages && sluggableTownCount > 0 && publishedTownCount === 0) {
    issues.push({
      code: 'DIRECTORY_EMPTY',
      severity: 'warning',
      message:
        'County has sluggable towns but none are marked published — directory links may be thin',
      section: 'directory',
    })
  }

  if (faqs.length < 4) {
    issues.push({
      code: 'FAQ_TOO_SHORT',
      severity: 'warning',
      message: `County FAQ has ${faqs.length} items; target at least 4`,
      section: 'faq',
    })
  }

  const townDirectoryVisible =
    featured.length > 0 ||
    publishedTownCount > 0 ||
    Boolean(content.townInsights?.highlights?.length)

  if (!townDirectoryVisible && cap.hasTownPages && sluggableTownCount > 0) {
    issues.push({
      code: 'RELATED_PLACES_EMPTY',
      severity: 'warning',
      message: 'No featured towns, published town links, or insights — towns block may not render',
      section: 'directory',
    })
  }

  if (!content.comparison) {
    issues.push({
      code: 'COMPARISON_UNAVAILABLE',
      severity: 'info',
      message: 'County comparison section not generated (peer metrics / baselines)',
      section: 'comparison',
    })
  }

  const substantiveExtras =
    (content.overview.paragraphs.length > 0 ? 1 : 0) +
    (content.comparison ? 1 : 0) +
    (trendOk ? 1 : 0) +
    (content.taxFactors.bullets.length > 0 ? 1 : 0) +
    (content.estimateGuide.steps.length > 0 ? 1 : 0) +
    (content.relatedCounties ? 1 : 0)

  if (substantiveExtras < 3) {
    issues.push({
      code: 'TOO_FEW_SUBSTANTIVE_SECTIONS',
      severity: 'warning',
      message: 'Few substantive builder sections beyond calculator — page may feel thin',
    })
  }

  // Planning note + chart footnote link methodology — treat as present
  const methodologyOk = true

  const sections: SectionAvailability = {
    hero: true,
    overview: content.overview.paragraphs.length > 0,
    snapshot: Boolean(countyHero?.show),
    calculator: canCalculateForState(stateSlug),
    comparison: Boolean(content.comparison?.items?.length),
    trend: trendOk,
    relatedPlaces: townDirectoryVisible,
    estimateGuide: content.estimateGuide.steps.length > 0,
    taxFactors: content.taxFactors.bullets.length > 0,
    faq: faqs.length > 0,
    methodology: methodologyOk,
    directory: publishedTownCount > 0 || featured.length > 0,
  }

  let score = 0
  const breakdown: Record<string, number> = {}
  breakdown.entity = 20
  score += 20

  if (countyHero?.show) {
    breakdown.snapshot = 15
    score += 15
  }
  if (canCalculateForState(stateSlug)) {
    breakdown.calculator = 10
    score += 10
  }
  if (townDirectoryVisible) {
    breakdown.directory = 10
    score += 10
  } else {
    breakdown.directory = 3
    score += 3
  }
  if (faqs.length >= 4) {
    breakdown.faq = 10
    score += 10
  } else {
    breakdown.faq = 5
    score += 5
  }
  if (methodologyOk) {
    breakdown.methodology = 10
    score += 10
  }
  if (content.overview.paragraphs.length > 0) {
    breakdown.overview = 5
    score += 5
  }
  if (content.comparison) {
    breakdown.comparison = 10
    score += 10
  }
  if (trendOk) {
    breakdown.trend = 5
    score += 5
  }
  if (content.taxFactors.bullets.length > 0) {
    breakdown.taxFactors = 5
    score += 5
  }

  const hardHold = !stateData || !county || !countyHero?.show || !canCalculateForState(stateSlug)

  const decision = decisionFromScoreAndIssues(score, issues, hardHold)

  const metrics = {
    primaryMetricResolved: Boolean(countyHero?.show),
    primaryMetricKey: countyHero?.key,
    fallbackUsed: false,
    townLevelPrimary: false,
    trendMetricResolved: trendOk,
    trendMetricKey: trendOk ? 'averageResidentialTaxBill' : undefined,
    /** County chart is always “county” series; not a fallback warning for county entity */
    trendCountyContext: false,
    comparableMetricResolved: Boolean(content.comparison?.items?.length),
    sourceRefPresent: Boolean(countyHero?.latestPoint?.sourceRef),
  }

  const countySeg = `${slugifyLocation(county.name)}-county-property-tax`
  const path = `/${encodeURIComponent(stateSlug)}/${encodeURIComponent(countySeg)}`

  const result: PublishReadinessResult = {
    decision,
    score,
    scoreBreakdown: breakdown,
    issues,
    sections,
    metrics,
    entityType: 'county',
    entityLabel,
    strongPage: false,
    stateSlug,
    countySlug: county.slug ?? normCounty,
    canonicalPath: path,
  }
  result.strongPage =
    computeStrongPage(result) &&
    publishedTownCount > 0 &&
    !issues.some(i => i.code === 'DIRECTORY_EMPTY' || i.code === 'RELATED_PLACES_EMPTY')
  return result
}

function abortedCounty(
  issues: ValidationIssue[],
  countySlug: string,
  stateSlug: string
): PublishReadinessResult {
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
    entityType: 'county',
    entityLabel: countySlug,
    strongPage: false,
    stateSlug,
    countySlug,
  }
}
