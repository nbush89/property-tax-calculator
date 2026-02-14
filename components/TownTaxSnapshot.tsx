/**
 * Town Tax Snapshot component
 * Displays key metrics (effective tax rate, median home value) with year context
 * Only shows metrics when data is available (no N/A placeholders)
 */

import type { StateData, CountyData, TownData } from '@/lib/data/types'
import { getMetricLatest, resolveSource } from '@/lib/data/town-helpers'
import { getTownDisplayName } from '@/utils/locationUtils'

interface TownTaxSnapshotProps {
  state: StateData
  county: CountyData
  town: TownData
}

/**
 * Format a number as USD currency
 */
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a number as percentage
 */
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export default function TownTaxSnapshot({ state, county, town }: TownTaxSnapshotProps) {
  // Get effective tax rate (town first, then county fallback)
  const effectiveRateDatapoint = getMetricLatest({
    town,
    county,
    metricKey: 'effectiveTaxRate',
  })

  // Check if rate is from town or county
  const hasTownRate = town.metrics?.effectiveTaxRate && town.metrics.effectiveTaxRate.length > 0
  const rateContext = hasTownRate ? 'town context' : 'county context'

  // Get median home value (town only, no fallback)
  const medianHomeValueDatapoint = town.metrics?.medianHomeValue
    ? town.metrics.medianHomeValue[town.metrics.medianHomeValue.length - 1]
    : undefined

  // Determine as-of year (use latest metric year, or town/county/state asOfYear)
  const asOfYear =
    effectiveRateDatapoint?.year ||
    medianHomeValueDatapoint?.year ||
    town.asOfYear ||
    county.asOfYear ||
    state.state.asOfYear ||
    new Date().getFullYear()

  // Don't render if no data at all
  if (!effectiveRateDatapoint && !medianHomeValueDatapoint) {
    return null
  }

  return (
    <div className="mb-8 border border-border rounded-lg bg-surface p-6">
      <h2 className="text-2xl font-semibold mb-4 text-text">{getTownDisplayName(town)} Property Tax Snapshot</h2>

      <div className="space-y-4">
        {/* Effective Tax Rate */}
        {effectiveRateDatapoint && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border last:border-b-0 last:pb-0">
            <div className="flex-1">
              <p className="text-sm text-text-muted mb-1">
                Effective property tax rate ({rateContext})
              </p>
              <p className="text-2xl font-semibold text-text">
                ~{formatPercent(effectiveRateDatapoint.value)} ({effectiveRateDatapoint.year})
              </p>
            </div>
          </div>
        )}

        {/* Median Home Value */}
        {medianHomeValueDatapoint && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border last:border-b-0 last:pb-0">
            <div className="flex-1">
              <p className="text-sm text-text-muted mb-1">Median home value</p>
              <p className="text-2xl font-semibold text-text">
                {formatUSD(medianHomeValueDatapoint.value)} ({medianHomeValueDatapoint.year})
              </p>
            </div>
          </div>
        )}

        {/* Planning Note */}
        <div className="pt-2">
          <p className="text-xs text-text-muted italic">
            Planning context only — actual bills depend on assessments and exemptions. Data as of{' '}
            {asOfYear}.
          </p>
        </div>
      </div>
    </div>
  )
}
