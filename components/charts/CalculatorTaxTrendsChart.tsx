'use client'

/**
 * Calculator Tax Trends Chart — supports currency (tax bill, home value) or percent (effective rate).
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
import type { YearValue } from '@/utils/getCountySeries'
import { computeYoYStats } from '@/lib/data/metrics'
import { taxBillLabelForState } from '@/lib/content/townContent'

interface CalculatorTaxTrendsChartProps {
  series: YearValue[]
  /** Legacy label used in default copy when chartTitle not set */
  countyName?: string
  /** State slug for state-aware labels in default subtitle */
  stateSlug?: string
  valueFormat?: 'usd' | 'percent'
  chartTitle?: string
  chartSubtitle?: string
  className?: string
}

/**
 * Format a number as USD currency
 */
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a number as percentage with 1 decimal place
 * Input is already a percentage (e.g., 5.2 means 5.2%)
 */
function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Custom tooltip for the chart
 */
function makeTooltip(format: 'usd' | 'percent') {
  return function CustomTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const val =
        format === 'usd' ? formatUSD(data.value) : `${Number(data.value).toFixed(2)}%`
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-text">{data.year}</p>
          <p className="text-sm text-text">{val}</p>
        </div>
      )
    }
    return null
  }
}

export default function CalculatorTaxTrendsChart({
  series,
  countyName = '',
  stateSlug = 'new-jersey',
  valueFormat = 'usd',
  chartTitle,
  chartSubtitle,
  className = '',
}: CalculatorTaxTrendsChartProps) {
  const { label: billLabel } = taxBillLabelForState(stateSlug)
  // Don't render if insufficient data
  if (series.length < 3) {
    return null
  }

  // Ensure sorted by year ascending
  const sorted = [...series].sort((a, b) => a.year - b.year)

  // Convert to format expected by computeYoYStats (DataPoint format)
  const metricSeries = sorted.map(d => ({
    year: d.year,
    value: d.value,
    unit: 'USD' as const,
    sourceRef: '',
  }))

  // Compute statistics
  const stats = computeYoYStats(metricSeries)
  if (!stats) {
    return null
  }

  // Prepare chart data
  const chartData = sorted.map(d => ({
    year: d.year.toString(),
    value: d.value,
  }))

  const latestYear = sorted[sorted.length - 1].year
  const title = chartTitle ?? 'Tax trend'
  const subtitle =
    chartSubtitle ??
    (countyName
      ? `County ${billLabel} in ${countyName} County. As of ${latestYear}. Planning/comparison only.`
      : `As of ${latestYear}. Planning/comparison only.`)

  return (
    <div className={`mt-6 ${className}`}>
      <h3 className="font-semibold text-text mb-3">{title}</h3>
      <p className="text-sm text-text-muted mb-4">{subtitle}</p>

      {/* YoY Stats */}
      {stats && (
        <div className="mb-4 text-sm text-text-muted">
          <span className="font-medium text-text">Latest YoY: </span>
          <span className="text-text">
            {valueFormat === 'usd' ? (
              <>
                {stats.delta >= 0 ? '+' : ''}
                {formatUSD(stats.delta)} ({formatPercent(stats.deltaPct)}) from {stats.prevYear}
              </>
            ) : (
              <>
                {stats.delta >= 0 ? '+' : ''}
                {stats.latestValue.toFixed(3)}% vs {stats.prevValue.toFixed(3)}% (
                {formatPercent(stats.deltaPct)}) from {stats.prevYear}
              </>
            )}
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
            <XAxis
              dataKey="year"
              stroke="currentColor"
              className="text-text-muted"
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <YAxis
              stroke="currentColor"
              className="text-text-muted"
              tick={{ fill: 'currentColor', fontSize: 12 }}
              tickFormatter={value => {
                if (valueFormat === 'percent') {
                  return `${Number(value).toFixed(2)}%`
                }
                if (value >= 1000) {
                  return `$${(value / 1000).toFixed(0)}K`
                }
                return `$${value.toFixed(0)}`
              }}
            />
            <Tooltip content={makeTooltip(valueFormat)} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="currentColor"
              className="text-primary"
              strokeWidth={2}
              dot={{ fill: 'currentColor', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
