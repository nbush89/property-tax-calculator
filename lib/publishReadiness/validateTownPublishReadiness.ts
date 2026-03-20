/**
 * Town page publish readiness — strictest entity type.
 */

import type { TownData, CountyData, StateData } from '@/lib/data/types'
import type { PublishReadinessResult, SectionAvailability, ValidationIssue } from './types'
import { getTownBySlugs, getStateData } from '@/lib/geo'
import { getTownDisplayName } from '@/utils/locationUtils'
import { canCalculateForState } from '@/lib/state-capabilities'
import { resolveTownPageOverview } from '@/lib/town-overview/resolve-page-overview'
import { resolveTownPageSections } from '@/lib/content/townContent'
import { getTownFaqData } from '@/data/townFaqData'
import { selectRelatedTowns } from '@/lib/links/towns'
import { slugifyLocation } from '@/utils/locationUtils'
import { pickBestTrendSeries } from '@/lib/town-overview/trend-series'
import { resolveTownPrimaryMetricForPublish, hasApprovedTownSnapshot } from './townPrimaryMetric'
import {
  findUnsupportedTownMetricsOnOverview,
  primaryMetricHasSourceRef,
} from './metricHonesty'
import { decisionFromScoreAndIssues, computeStrongPage } from './decide'

function townSlugNormalized(townSlug: string): string {
  return decodeURIComponent(townSlug).replace(/-property-tax$/, '')
}

export function validateTownPublishReadiness(params: {
  stateSlug: string
  countySlug: string
  townSlug: string
  /** When omitted, loaded via getTownBySlugs */
  stateData?: StateData | null
}): PublishReadinessResult {
  const issues: ValidationIssue[] = []
  const stateSlug = params.stateSlug.toLowerCase()
  const stateData = params.stateData ?? getStateData(stateSlug)
  const countySlugParam = params.countySlug
  const townSlugParam = params.townSlug

  let county: CountyData | undefined
  let town: TownData | undefined
  let entityLabel = `${townSlugParam} / ${countySlugParam}`

  if (!stateData) {
    issues.push({
      code: 'STATE_NOT_RESOLVED',
      severity: 'error',
      message: `State data not found for slug "${stateSlug}"`,
    })
    return abortedTownResult(issues, entityLabel, stateSlug, countySlugParam, townSlugParam)
  }

  const resolved = getTownBySlugs(stateSlug, countySlugParam, townSlugParam)
  if (!resolved) {
    issues.push({
      code: 'TOWN_NOT_RESOLVED',
      severity: 'error',
      message: 'Town or county slug did not resolve to a town record',
    })
    return abortedTownResult(issues, entityLabel, stateSlug, countySlugParam, townSlugParam)
  }
  county = resolved.county
  town = resolved.town
  entityLabel = `${getTownDisplayName(town)}, ${county.name}, ${stateData.state.name}`

  const overview = resolveTownPageOverview(town, county, stateData)
  const sections = resolveTownPageSections({
    town,
    county,
    stateData,
    townDisplayName: getTownDisplayName(town),
    overview,
  })

  const hasTownAvgBill = Boolean(town.metrics?.averageResidentialTaxBill?.length)
  const hasTownRate = Boolean(town.metrics?.effectiveTaxRate?.length)
  const usesCountyFallback =
    overview != null &&
    ((overview.countyAvgTaxBill != null &&
      overview.avgResidentialTaxBill === overview.countyAvgTaxBill) ||
      (overview.countyEffectiveRatePct != null &&
        overview.effectiveTaxRatePct === overview.countyEffectiveRatePct))

  const trendPick = pickBestTrendSeries(town, county)
  const trendOk = trendPick != null && trendPick.points.length >= 3
  const trendCountyContext = trendPick?.scope === 'county'

  const relatedTowns = selectRelatedTowns(county, townSlugNormalized(townSlugParam), {
    max: 6,
    stateSlug,
  })

  const faqs = getTownFaqData(town.name, county.name, stateSlug, {
    hasTownAvgBillMetric: hasTownAvgBill,
    hasTownRateMetric: hasTownRate,
    usesCountyFallback: Boolean(usesCountyFallback),
  })

  const primary = resolveTownPrimaryMetricForPublish(stateSlug, town, county, overview)
  const snapshotOk = overview != null && hasApprovedTownSnapshot(stateSlug, town, county, overview)

  const unsupported = findUnsupportedTownMetricsOnOverview(stateSlug, overview)
  for (const mk of unsupported) {
    issues.push({
      code: 'UNSUPPORTED_METRIC_RENDERED',
      severity: 'error',
      message: `Overview exposes ${mk} but this metric is not supported for town geography in state config`,
      section: 'snapshot',
      metricKey: mk,
    })
  }

  if (overview == null) {
    issues.push({
      code: 'SNAPSHOT_MISSING',
      severity: 'error',
      message: 'Town overview failed validation after enrich — snapshot card cannot render fully',
      section: 'snapshot',
    })
  } else if (!snapshotOk) {
    issues.push({
      code: 'PRIMARY_METRIC_MISSING',
      severity: 'error',
      message: 'No capability-backed primary metric (bill, effective rate, or median) with data',
      section: 'snapshot',
    })
  }

  if (primary?.countyFallbackForPrimary) {
    issues.push({
      code: 'FALLBACK_SNAPSHOT_USED',
      severity: 'warning',
      message: 'Headline metric uses county-context values (no town-level series for primary choice)',
      section: 'snapshot',
      metricKey: primary.metricKey,
    })
    issues.push({
      code: 'COUNTY_FALLBACK_USED',
      severity: 'info',
      message: 'County fill appears in snapshot; UI should label county context (capability-driven)',
      section: 'snapshot',
    })
  }

  if (trendCountyContext && trendOk) {
    issues.push({
      code: 'FALLBACK_TREND_USED',
      severity: 'info',
      message: 'Trend chart uses county series as context (town series unavailable or too short)',
      section: 'trend',
      metricKey: trendPick?.metricKey,
    })
  } else if (!trendOk) {
    issues.push({
      code: 'TREND_UNAVAILABLE',
      severity: 'info',
      message: 'No trend chart: fewer than 3 usable points in bill/rate series (town or county)',
      section: 'trend',
    })
  }

  if (!canCalculateForState(stateSlug)) {
    issues.push({
      code: 'CALCULATOR_MISSING',
      severity: 'error',
      message: 'State capabilities do not support calculator (no county/municipal or Comptroller path)',
      section: 'calculator',
    })
  }

  if (faqs.length < 4) {
    issues.push({
      code: 'FAQ_TOO_SHORT',
      severity: 'warning',
      message: `FAQ has ${faqs.length} items; prefer at least 4 for town pages`,
      section: 'faq',
    })
  }

  const sourceRefPresent = primaryMetricHasSourceRef({
    stateSlug,
    town,
    county,
    primaryKey: primary?.metricKey,
  })
  if (primary && !sourceRefPresent) {
    issues.push({
      code: 'SOURCE_REF_MISSING',
      severity: 'warning',
      message: 'Primary metric latest point lacks sourceRef in town/county series',
      section: 'methodology',
      metricKey: primary.metricKey,
    })
  }

  // Town route always renders Sources + link to /methodology
  const methodologyOk = true

  if (!sections.comparison) {
    issues.push({
      code: 'COMPARISON_UNAVAILABLE',
      severity: 'info',
      message: 'No county/state comparison bullets (insufficient vs baselines in overview)',
      section: 'comparison',
    })
  }

  if (relatedTowns.length === 0) {
    issues.push({
      code: 'RELATED_PLACES_EMPTY',
      severity: 'warning',
      message: 'No sibling towns returned for related-towns section',
      section: 'relatedPlaces',
    })
  }

  const substantiveSignals =
    (sections.comparison ? 1 : 0) +
    (trendOk ? 1 : 0) +
    (relatedTowns.length > 0 ? 1 : 0) +
    (usesCountyFallback ? 1 : 0)

  if (substantiveSignals === 0) {
    issues.push({
      code: 'PAGE_TOO_THIN',
      severity: 'warning',
      message: 'No comparison, trend, related towns, or county-fallback transparency — page may feel empty',
      section: 'overview',
    })
  }

  const depthThin =
    !sections.comparison &&
    !trendOk &&
    relatedTowns.length === 0 &&
    primary?.countyFallbackForPrimary
  if (depthThin) {
    issues.push({
      code: 'TOO_FEW_SUBSTANTIVE_SECTIONS',
      severity: 'warning',
      message: 'Sparse town page: only overview/estimate/calculator with county-primary snapshot',
    })
  }

  const sectionAvail: SectionAvailability = {
    hero: true,
    overview: sections.overviewParagraphs.length > 0,
    snapshot: overview != null,
    calculator: canCalculateForState(stateSlug),
    comparison: Boolean(sections.comparison?.items.length),
    trend: trendOk,
    relatedPlaces: relatedTowns.length > 0,
    estimateGuide: sections.estimateGuide.steps.length > 0,
    faq: faqs.length > 0,
    methodology: methodologyOk,
  }

  const comparableMetricResolved = Boolean(sections.comparison?.items.length)

  let score = 0
  const breakdown: Record<string, number> = {}
  breakdown.entity = 20
  score += 20
  if (snapshotOk && overview != null) {
    breakdown.snapshot = 20
    score += 20
  }
  if (canCalculateForState(stateSlug)) {
    breakdown.calculator = 15
    score += 15
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
  if (sections.comparison?.items.length) {
    breakdown.comparison = 10
    score += 10
  }
  if (trendOk) {
    breakdown.trend = 5
    score += 5
  }
  if (relatedTowns.length > 0) {
    breakdown.related = 5
    score += 5
  }
  if (sections.estimateGuide.steps.length > 0) {
    breakdown.estimateGuide = 5
    score += 5
  }

  const hardHold =
    !stateData ||
    !resolved ||
    overview == null ||
    !snapshotOk ||
    !canCalculateForState(stateSlug) ||
    unsupported.length > 0

  const decision = decisionFromScoreAndIssues(score, issues, hardHold)

  const metrics = {
    primaryMetricResolved: primary != null,
    primaryMetricKey: primary?.metricKey,
    fallbackUsed: Boolean(primary?.countyFallbackForPrimary),
    townLevelPrimary: Boolean(primary?.townLevel),
    trendMetricResolved: trendOk,
    trendMetricKey: trendPick?.metricKey,
    trendCountyContext,
    comparableMetricResolved,
    sourceRefPresent,
  }

  const encState = encodeURIComponent(stateSlug)
  const countySeg = `${slugifyLocation(county.name)}-county-property-tax`
  const townSeg = `${slugifyLocation(town.name) || townSlugNormalized(townSlugParam)}-property-tax`
  const path = `/${encState}/${encodeURIComponent(countySeg)}/${encodeURIComponent(townSeg)}`

  const result: PublishReadinessResult = {
    decision,
    score,
    scoreBreakdown: breakdown,
    issues,
    sections: sectionAvail,
    metrics,
    entityType: 'town',
    entityLabel,
    strongPage: false,
    stateSlug,
    countySlug: county.slug,
    townSlug: townSeg.replace(/-property-tax$/, ''),
    canonicalPath: path,
  }
  result.strongPage = computeStrongPage(result)
  return result
}

function abortedTownResult(
  issues: ValidationIssue[],
  entityLabel: string,
  stateSlug: string,
  countySlug: string,
  townSlug: string
): PublishReadinessResult {
  const emptySections: SectionAvailability = {
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
  }
  return {
    decision: 'hold',
    score: 0,
    issues,
    sections: emptySections,
    metrics: {
      primaryMetricResolved: false,
      fallbackUsed: false,
      townLevelPrimary: false,
      trendMetricResolved: false,
      trendCountyContext: false,
      comparableMetricResolved: false,
      sourceRefPresent: false,
    },
    entityType: 'town',
    entityLabel,
    strongPage: false,
    stateSlug,
    countySlug,
    townSlug: townSlug.replace(/-property-tax$/, ''),
  }
}
