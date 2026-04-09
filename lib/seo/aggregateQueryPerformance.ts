/**
 * Roll up query-level Search Console rows to page-level performance.
 */

import { pathToEntity } from './pathToEntity'
import type { QueryRow } from './importSearchConsoleQueries'
import type { SeoEntityType } from './types'

export type PageAggregate = {
  pagePath: string
  entityType: SeoEntityType
  stateSlug: string
  countySlug?: string
  townSlug?: string
  impressions: number
  clicks: number
  ctr: number
  avgPosition: number
  topQueries: QueryRow[]
}

export type AggregateQueryPerformanceResult = {
  aggregates: PageAggregate[]
  unmatchedPagePaths: string[]
}

function sortByImpressionsDesc(a: QueryRow, b: QueryRow): number {
  return b.impressions - a.impressions || b.clicks - a.clicks
}

/**
 * Group rows by normalized page path. Unmatched paths (unknown site routes) are listed separately
 * and omitted from `aggregates`.
 */
export function aggregateQueryPerformance(rows: QueryRow[]): AggregateQueryPerformanceResult {
  const byPath = new Map<string, QueryRow[]>()
  for (const r of rows) {
    const list = byPath.get(r.pagePath) ?? []
    list.push(r)
    byPath.set(r.pagePath, list)
  }

  const aggregates: PageAggregate[] = []
  const unmatchedPagePaths: string[] = []

  for (const [pagePath, list] of byPath) {
    const entity = pathToEntity(pagePath)
    if (!entity.matched) {
      if (!unmatchedPagePaths.includes(pagePath)) unmatchedPagePaths.push(pagePath)
      continue
    }

    let impressions = 0
    let clicks = 0
    let posWeighted = 0

    for (const q of list) {
      impressions += q.impressions
      clicks += q.clicks
      posWeighted += q.position * q.impressions
    }

    const ctr = impressions > 0 ? clicks / impressions : 0
    const avgPosition = impressions > 0 ? posWeighted / impressions : 0

    const topQueries = [...list].sort(sortByImpressionsDesc).slice(0, 8)

    aggregates.push({
      pagePath,
      entityType: entity.entityType as SeoEntityType,
      stateSlug: entity.stateSlug,
      countySlug: entity.countySlug ?? undefined,
      townSlug: entity.townSlug ?? undefined,
      impressions,
      clicks,
      ctr,
      avgPosition,
      topQueries,
    })
  }

  aggregates.sort((a, b) => b.impressions - a.impressions)

  return { aggregates, unmatchedPagePaths }
}
