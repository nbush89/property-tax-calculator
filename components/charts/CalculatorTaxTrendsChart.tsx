'use client'

/**
 * Calculator Tax Trends Chart Component
 * Displays a historical chart of county average residential tax bill
 * Only renders when series has at least 3 data points
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

interface CalculatorTaxTrendsChartProps {
  series: YearValue[]
  countyName: string
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

export default function CalculatorTaxTrendsChart({
  series,
  countyName,
  className = '',
}: CalculatorTaxTrendsChartProps) {
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

  return (
    <div className={`mt-6 ${className}`}>
      <h3 className="font-semibold text-text mb-3">Tax Trend</h3>
      <p className="text-sm text-text-muted mb-4">
        County average residential tax bill trend in {countyName} County. As of {latestYear}.
        Planning/comparison only.
      </p>

      {/* YoY Stats */}
      {stats && (
        <div className="mb-4 text-sm text-text-muted">
          <span className="font-medium text-text">Latest YoY: </span>
          <span className="text-text">
            {stats.delta >= 0 ? '+' : ''}
            {formatUSD(stats.delta)} ({formatPercent(stats.deltaPct)}) from {stats.prevYear}
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
                // Abbreviate large numbers (e.g., $10K, $15K)
                if (value >= 1000) {
                  return `$${(value / 1000).toFixed(0)}K`
                }
                return `$${value.toFixed(0)}`
              }}
            />
            <Tooltip content={<CustomTooltip />} />
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
