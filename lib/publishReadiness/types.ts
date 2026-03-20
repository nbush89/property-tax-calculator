/**
 * Publish readiness / QA gating — structured results for scripts and future sitemap use.
 */

export type PublishDecision = 'publish' | 'publish_with_warnings' | 'hold'

export type ValidationIssueSeverity = 'error' | 'warning' | 'info'

export type ValidationIssueCode =
  | 'ENTITY_NOT_RESOLVED'
  | 'STATE_NOT_RESOLVED'
  | 'COUNTY_NOT_RESOLVED'
  | 'TOWN_NOT_RESOLVED'
  | 'SNAPSHOT_MISSING'
  | 'PRIMARY_METRIC_MISSING'
  | 'FALLBACK_SNAPSHOT_USED'
  | 'TREND_UNAVAILABLE'
  | 'FALLBACK_TREND_USED'
  | 'COMPARISON_UNAVAILABLE'
  | 'RELATED_PLACES_EMPTY'
  | 'DIRECTORY_EMPTY'
  | 'FAQ_MISSING'
  | 'FAQ_TOO_SHORT'
  | 'METHODOLOGY_MISSING'
  | 'SOURCE_REF_MISSING'
  | 'UNSUPPORTED_METRIC_RENDERED'
  | 'NON_COMPARABLE_METRIC_COMPARED'
  | 'TOO_FEW_SUBSTANTIVE_SECTIONS'
  | 'CALCULATOR_MISSING'
  | 'PAGE_TOO_THIN'
  | 'COUNTY_FALLBACK_USED'
  | 'TOWN_LEVEL_PRECISION_UNSUPPORTED'

export type ValidationIssue = {
  code: ValidationIssueCode
  severity: ValidationIssueSeverity
  message: string
  section?: string
  metricKey?: string
}

/** Mirrors sections the app can render; used for diagnostics (not React props). */
export type SectionAvailability = {
  hero: boolean
  overview: boolean
  snapshot: boolean
  calculator: boolean
  comparison: boolean
  trend: boolean
  relatedPlaces: boolean
  estimateGuide: boolean
  faq: boolean
  methodology: boolean
  directory?: boolean
  taxFactors?: boolean
}

export type MetricAvailabilitySummary = {
  primaryMetricResolved: boolean
  primaryMetricKey?: string
  fallbackUsed: boolean
  /** Primary headline backed by town-level series (not county-only fill). */
  townLevelPrimary?: boolean
  trendMetricResolved: boolean
  trendMetricKey?: string
  trendCountyContext: boolean
  comparableMetricResolved: boolean
  sourceRefPresent: boolean
}

export type PublishReadinessResult = {
  decision: PublishDecision
  score: number
  /** 0–100, same as score; kept for clarity in reports */
  scoreBreakdown?: Record<string, number>
  issues: ValidationIssue[]
  sections: SectionAvailability
  metrics: MetricAvailabilitySummary
  entityType: 'state' | 'county' | 'town'
  entityLabel: string
  /** True when safe for confident rollout (no errors, strong signal, minimal fallback reliance). */
  strongPage: boolean
  stateSlug?: string
  countySlug?: string
  townSlug?: string
  canonicalPath?: string
}

export type PublishPageTarget =
  | { entityType: 'town'; stateSlug: string; countySlug: string; townSlug: string }
  | { entityType: 'county'; stateSlug: string; countySlug: string }
  | { entityType: 'state'; stateSlug: string }
