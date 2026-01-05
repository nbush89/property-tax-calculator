'use client'

/**
 * County Tax Trends Chart Component
 * Displays a historical chart of average residential tax bill with YoY statistics
 * Only renders when series has at least 2 data points
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
import type { MetricSeries, MetricDatapoint } from '@/lib/data/types'
import { computeYoYStats } from '@/lib/data/metrics'

interface CountyTaxTrendsChartProps {
  county: {
    name: string
    slug: string
    metrics?: {
      averageResidentialTaxBill?: MetricSeries
    }
  }
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
 * Format a number as percentage with 1 decimal place
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

export default function CountyTaxTrendsChart({ county }: CountyTaxTrendsChartProps) {
  const series = county.metrics?.averageResidentialTaxBill ?? []

  // Don't render if insufficient data
  if (series.length < 2) {
    return null
  }

  // Sort by year ascending
  const sorted = [...series].sort((a, b) => a.year - b.year)

  // Compute statistics
  const stats = computeYoYStats(sorted)
  if (!stats) {
    return null
  }

  // Prepare chart data
  const chartData = sorted.map(d => ({
    year: d.year.toString(),
    value: d.value,
  }))

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-2 text-text">
        Average Residential Property Tax Trend in {county.name} County
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Planning context only — historical averages for comparison. Actual tax bills vary by
        municipality and exemptions.
      </p>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Latest</p>
          <p className="text-xl font-semibold text-text">
            {formatUSD(stats.latestValue)} ({stats.latestYear})
          </p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Year-over-Year Change</p>
          <p className="text-xl font-semibold text-text">
            {stats.delta >= 0 ? '+' : ''}
            {formatUSD(stats.delta)} ({formatPercent(stats.deltaPct)}) from {stats.prevYear}
          </p>
        </div>
        {stats.fiveYearDelta !== undefined && sorted.length >= 2 && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {sorted.length}-Year Change
            </p>
            <p className="text-xl font-semibold text-text">
              {stats.fiveYearDelta >= 0 ? '+' : ''}
              {formatUSD(stats.fiveYearDelta)} ({formatPercent(stats.fiveYearDeltaPct ?? 0)}) from{' '}
              {sorted[0].year}
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="year"
              className="text-gray-600 dark:text-gray-400"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              className="text-gray-600 dark:text-gray-400"
              style={{ fontSize: '12px' }}
              tickFormatter={value => {
                // Format Y-axis as abbreviated currency (e.g., $10K, $15K)
                if (value >= 1000) {
                  return `$${Math.round(value / 1000)}K`
                }
                return `$${value}`
              }}
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

      {/* Footnote */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
        Data reflects county-wide averages and may not represent individual municipality tax bills.
        Years shown are tax years as reported by the NJ Division of Taxation.
      </p>
    </section>
  )
}
