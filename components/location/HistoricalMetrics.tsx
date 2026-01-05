'use client'

import type { MetricSeries } from '@/lib/data/types'
import { getLastN, computeYoY, getLatest } from '@/lib/data/metrics'
import { formatUSD } from '@/lib/geo'

interface HistoricalMetricsProps {
  series: MetricSeries
  title: string
  formatValue: (value: number) => string
  unitLabel?: string
}

export default function HistoricalMetrics({
  series,
  title,
  formatValue,
  unitLabel,
}: HistoricalMetricsProps) {
  if (!series || series.length < 2) {
    return null // Don't render if less than 2 years of data
  }

  const historical = getLastN(series, 5)
  const yoy = computeYoY(series)
  const latest = getLatest(series)

  return (
    <div className="mt-8 rounded-lg border border-border bg-surface p-6">
      <h3 className="text-xl font-semibold mb-4 text-text">{title}</h3>

      {yoy !== null && (
        <div className="mb-4 p-3 rounded bg-primary-soft/10 border border-primary/20">
          <p className="text-sm text-text-muted">
            Year-over-year change:{' '}
            <span className={`font-semibold ${yoy >= 0 ? 'text-error' : 'text-success'}`}>
              {yoy >= 0 ? '+' : ''}
              {yoy.toFixed(1)}%
            </span>
            {latest && ` (${latest.year - 1} to ${latest.year})`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {historical.map((datapoint, index) => (
          <div
            key={datapoint.year}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-muted w-16">{datapoint.year}</span>
              <span className="text-text">
                {formatValue(datapoint.value)}
                {unitLabel && <span className="text-text-muted ml-1">{unitLabel}</span>}
              </span>
            </div>
            {index === historical.length - 1 && (
              <span className="text-xs px-2 py-1 rounded bg-primary-soft text-primary">Latest</span>
            )}
          </div>
        ))}
      </div>

      {latest?.source && (
        <p className="mt-4 text-xs text-text-muted">
          Source: {latest.source.name}
          {latest.source.reference && (
            <>
              {' '}
              <a
                href={latest.source.reference}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                (reference)
              </a>
            </>
          )}
        </p>
      )}
    </div>
  )
}
