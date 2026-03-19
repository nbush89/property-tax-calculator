/**
 * Town Tax Snapshot — key metrics from capability-filtered town (+ county fallback) series.
 */

import type { StateData, CountyData, TownData } from '@/lib/data/types'
import { getTownDisplayName } from '@/utils/locationUtils'
import {
  buildTownMetricPayload,
  resolveDisplayMetrics,
  formatResolvedMetricValue,
} from '@/lib/metrics/resolveDisplayMetrics'
import { MetricCaveatTrigger } from '@/components/metrics/MetricCaveatTrigger'

interface TownTaxSnapshotProps {
  state: StateData
  county: CountyData
  town: TownData
}

export default function TownTaxSnapshot({ state, county, town }: TownTaxSnapshotProps) {
  const stateSlug = state.state.slug
  const payload = buildTownMetricPayload(town, county)
  const resolved = resolveDisplayMetrics({
    stateSlug,
    geographyLevel: 'town',
    metrics: payload,
  })

  if (resolved.length === 0) {
    return null
  }

  const asOfYear =
    resolved[0]?.latestPoint?.year ??
    town.asOfYear ??
    county.asOfYear ??
    state.state.asOfYear ??
    new Date().getFullYear()

  return (
    <div className="mb-8 border border-border rounded-lg bg-surface p-6">
      <h2 className="text-2xl font-semibold mb-4 text-text">
        {getTownDisplayName(town)} Property Tax Snapshot
      </h2>

      <div className="space-y-4">
        {resolved.map(m => (
          <div
            key={m.key}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border last:border-b-0 last:pb-0"
          >
            <div className="flex-1">
              <p className="text-sm text-text-muted mb-1 flex flex-wrap items-center gap-1">
                {m.catalog.label}
                <MetricCaveatTrigger
                  semantics={m.semantics}
                  comparability={m.comparability}
                  note={m.note}
                  catalogCaveat={m.catalog.defaultCaveat}
                />
              </p>
              <p className="text-2xl font-semibold text-text">
                {m.catalog.format === 'percent' ? '~' : ''}
                {formatResolvedMetricValue(m)} ({m.latestPoint?.year})
              </p>
            </div>
          </div>
        ))}

        <div className="pt-2">
          <p className="text-xs text-text-muted italic">
            Planning context only — actual bills depend on assessments and exemptions. Data as of
            latest available year by source
            {asOfYear != null ? ` — updated through ${asOfYear} where available` : ''}.
          </p>
        </div>
      </div>
    </div>
  )
}
