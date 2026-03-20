/**
 * SEO / Search Console CTR workflow — separate from publish readiness & state JSON.
 */

export type SeoEntityType = 'state' | 'county' | 'town'

export type SeoReviewStatus = 'open' | 'in_progress' | 'optimized' | 'ignore'

export type CtrOpportunityLevel = 'high' | 'medium' | 'low' | 'none'

export type SearchPerformanceSnapshotRecord = {
  id: string
  entityType: SeoEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  pagePath: string
  impressions: number
  clicks: number
  /** 0–1 */
  ctr: number
  averagePosition: number
  topQueriesJson: unknown[] | Record<string, unknown> | null
  sourceDateStart: string | null
  sourceDateEnd: string | null
  importedAt: string
}

export type SeoOptimizationReviewRecord = {
  id: string
  pagePath: string
  entityType: SeoEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  status: SeoReviewStatus
  notes: string | null
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
}
