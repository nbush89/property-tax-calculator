/**
 * Data-presence / legacy “live” gate for UI lists, county pages, and scripts.
 * Sitemap town URLs use {@link isTownIndexable} (publish readiness + overrides) instead.
 */

import type { TownData } from '@/lib/data/types'

/**
 * Deterministic filter: town has metrics or explicit isLive.
 * Used outside sitemap (featured towns, directory copy, publish readiness batch hints).
 */
export function isTownPublished(town: TownData | Record<string, unknown>): boolean {
  const t = town as Record<string, unknown>
  if (t.isLive === true) {
    return true
  }
  // Gate towns whose rollout flag explicitly marks them as not ready
  const rollout = t.rollout as { isReady?: boolean } | undefined
  if (rollout?.isReady === false) {
    return false
  }
  const metrics = t.metrics as
    | { effectiveTaxRate?: unknown[]; averageResidentialTaxBill?: unknown[]; medianTaxesPaid?: unknown[] }
    | undefined
  if (!metrics) {
    return false
  }
  const hasRate = (metrics.effectiveTaxRate?.length ?? 0) > 0
  const hasBill =
    (metrics.averageResidentialTaxBill?.length ?? 0) > 0 ||
    (metrics.medianTaxesPaid?.length ?? 0) > 0
  return hasRate || hasBill
}
