'use client'

/**
 * County Tax Trends Chart Component
 *
 * Renders a 5-year trend chart with YoY + multi-year change stats for the
 * county's primary historical bill metric. Always shown in dollars — the
 * effective rate is deliberately NOT used as a fallback because it can
 * decline while bills rise (when home values appreciate faster than millage),
 * which misleads users.
 *
 * Mode is chosen by data availability:
 *   - averageResidentialTaxBill — preferred when state publishes it (NJ).
 *   - medianTaxesPaid (ACS B25103) — fallback when state doesn't publish a
 *     per-municipality avg bill (GA, TX). Honest dollar figure homeowners
 *     actually pay, surveyed and aggregated to county level.
 *
 * Returns null gracefully when neither dollar series has enough data.
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { MetricSeries } from '@/lib/data/types'
import { computeYoYStats } from '@/lib/data/metrics'
import {
  shouldShowCountyAverageTaxBillTrend,
} from '@/lib/metrics/resolveDisplayMetrics'
import { getMetricAvailability } from '@/lib/metrics/stateMetricCapabilities'
import { taxBillLabelForState } from '@/lib/content/townContent'

interface CountyTaxTrendsChartProps {
  stateSlug: string
  county: {
    name: string
    slug: string
    metrics?: {
      averageResidentialTaxBill?: MetricSeries
      medianTaxesPaid?: MetricSeries
      effectiveTaxRate?: MetricSeries
    }
  }
}

/** Both modes display in dollars; difference is the data source and labeling. */
type ChartMode = 'avg_bill' | 'median_taxes'

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDeltaPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatAbsoluteDelta(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatUSD(value)}`
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-text">{data.year}</p>
        <p className="text-sm text-text">{formatUSD(data.value)}</p>
      </div>
    )
  }
  return null
}

export default function CountyTaxTrendsChart({ stateSlug, county }: CountyTaxTrendsChartProps) {
  const billSeries = county.metrics?.averageResidentialTaxBill ?? []
  const medianTaxesSeries = county.metrics?.medianTaxesPaid ?? []

  // Mode by data availability — both are dollars, both are honest trend metrics.
  // Effective rate is deliberately NOT used here even when available, because
  // a falling rate during rising bills creates the wrong impression.
  const canShowAvgBill =
    shouldShowCountyAverageTaxBillTrend(stateSlug) && billSeries.length >= 2
  const medianTaxesAv = getMetricAvailability(stateSlug, 'county', 'medianTaxesPaid')
  const canShowMedianTaxes =
    (medianTaxesAv?.supported !== false) && medianTaxesSeries.length >= 2

  let mode: ChartMode | null = null
  if (canShowAvgBill) mode = 'avg_bill'
  else if (canShowMedianTaxes) mode = 'median_taxes'
  if (!mode) return null

  const series = mode === 'avg_bill' ? billSeries : medianTaxesSeries
  const sorted = [...series].sort((a, b) => a.year - b.year)

  const stats = computeYoYStats(sorted)
  if (!stats) return null

  // Labels per mode
  const billLabels = taxBillLabelForState(stateSlug)
  const shortLabel = mode === 'avg_bill' ? billLabels.shortLabel : 'Median tax bill'
  const longLabel =
    mode === 'avg_bill'
      ? billLabels.label
      : 'median real estate taxes paid (ACS survey)'
  const formatValue = formatUSD

  const chartData = sorted.map(d => ({
    year: d.year.toString(),
    value: d.value,
  }))

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-2 text-text">
        {shortLabel} trend in {county.name} County
      </h2>
      <p className="text-sm text-text-muted mb-6 measure">
        Planning context only — historical {longLabel} for comparison. Actual
        tax bills vary by municipality and exemptions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-xl border border-border bg-border overflow-hidden mb-6">
        <div className="bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Latest</p>
          <p className="text-[26px] font-semibold text-text leading-none mt-2 tabular-nums">
            {formatValue(stats.latestValue)}
          </p>
          <p className="text-xs text-text-muted mt-1.5 tabular-nums">{stats.latestYear}</p>
        </div>
        <div className="bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Year over year</p>
          <p
            className={`text-[26px] font-semibold leading-none mt-2 tabular-nums ${
              stats.delta >= 0 ? 'text-emerald-600' : 'text-text'
            }`}
          >
            {formatAbsoluteDelta(stats.delta)}
          </p>
          <p className="text-xs text-text-muted mt-1.5 tabular-nums">
            {formatDeltaPercent(stats.deltaPct)} from {stats.prevYear}
          </p>
        </div>
        {stats.fiveYearDelta !== undefined && sorted.length >= 2 && (
          <div className="bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {sorted.length}-Year change
            </p>
            <p
              className={`text-[26px] font-semibold leading-none mt-2 tabular-nums ${
                stats.fiveYearDelta >= 0 ? 'text-emerald-600' : 'text-text'
              }`}
            >
              {formatAbsoluteDelta(stats.fiveYearDelta)}
            </p>
            <p className="text-xs text-text-muted mt-1.5 tabular-nums">
              {formatDeltaPercent(stats.fiveYearDeltaPct ?? 0)} from {sorted[0].year}
            </p>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="year"
              className="text-text-muted"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              className="text-text-muted"
              style={{ fontSize: '12px' }}
              tickFormatter={value =>
                value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${value}`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2F6FED"
              strokeWidth={2}
              dot={{ fill: '#2F6FED', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-text-muted mt-4 italic">
        {mode === 'avg_bill'
          ? `Data reflects county-wide ${longLabel} where published and may not represent individual municipality tax bills.`
          : `U.S. Census ACS 5-year estimates (B25103_001E) — the median amount homeowners actually pay annually. Reflects all overlapping taxing units net of typical homestead exemptions. Bills for any specific home will vary with assessed value, millage components, and exemption stacking.`}{' '}
        Years shown follow each source&apos;s reporting.
      </p>
    </section>
  )
}
