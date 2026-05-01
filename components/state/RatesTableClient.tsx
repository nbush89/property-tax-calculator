'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TownRateRow {
  name: string
  href: string | null // null = not published
  effectiveRatePct: number | null
  rateYear: number | null
  medianBill: number | null
}

export interface CountyRateRow {
  rank: number
  name: string
  countyHref: string
  effectiveRatePct: number | null
  rateYear: number | null
  avgBill: number | null
  billYear: number | null
  /** Oldest→newest values for sparkline */
  trend: number[]
  towns: TownRateRow[]
}

interface Props {
  stateSlug: string
  stateName: string
  counties: CountyRateRow[]
  /** Whether avg bill column is meaningful for this state */
  hasBillData: boolean
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-text-muted text-xs">—</span>
  const w = 56,
    h = 22,
    pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.01
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2)
      const y = h - pad - ((v - min) / range) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="inline-block">
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  )
}

// ─── Chevron ──────────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RatesTableClient({ stateSlug, stateName, counties, hasBillData }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  if (counties.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center text-text-muted">
        <p>County rate data for {stateName} is being added. Check back soon.</p>
        <Link
          href={`/${stateSlug}/property-tax-calculator`}
          className="mt-4 inline-block data-link"
        >
          Go to {stateName} calculator →
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left">
            <th className="w-10 px-4 py-3 font-medium text-text-muted text-right">#</th>
            <th className="px-4 py-3 font-medium text-text-muted">County</th>
            <th className="px-4 py-3 text-right font-medium text-text-muted whitespace-nowrap">
              Eff. Rate
            </th>
            {hasBillData && (
              <th className="px-4 py-3 text-right font-medium text-text-muted whitespace-nowrap">
                Avg Bill
              </th>
            )}
            <th className="px-4 py-3 text-right font-medium text-text-muted">Trend</th>
            <th className="w-10 px-4 py-3" aria-label="Expand towns" />
          </tr>
        </thead>
        <tbody>
          {counties.map((county, i) => {
            const isOpen = expanded.has(county.name)
            const hasTowns = county.towns.length > 0
            return (
              <Fragment key={county.name}>
                <tr
                  key={county.name}
                  className={`border-b border-border transition-colors ${
                    i % 2 === 0 ? 'bg-bg' : 'bg-surface/30'
                  } ${hasTowns ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                  onClick={hasTowns ? () => toggle(county.name) : undefined}
                  aria-expanded={hasTowns ? isOpen : undefined}
                >
                  {/* Rank */}
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted text-xs">
                    {String(county.rank).padStart(2, '0')}
                  </td>

                  {/* County name */}
                  <td className="px-4 py-3">
                    <Link
                      href={county.countyHref}
                      className="font-medium text-primary hover:text-primary-hover transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      {county.name} County
                    </Link>
                    {hasTowns && (
                      <span className="ml-2 text-xs text-text-muted">
                        {county.towns.length} {county.towns.length === 1 ? 'town' : 'towns'}
                      </span>
                    )}
                  </td>

                  {/* Effective rate */}
                  <td className="px-4 py-3 text-right tabular-nums text-text">
                    {county.effectiveRatePct != null ? (
                      <>
                        <span className="font-medium">{county.effectiveRatePct.toFixed(2)}%</span>
                        {county.rateYear != null && (
                          <span className="ml-1 text-xs text-text-muted">({county.rateYear})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Avg bill (NJ only) */}
                  {hasBillData && (
                    <td className="px-4 py-3 text-right tabular-nums text-text">
                      {county.avgBill != null ? (
                        <>
                          <span className="font-medium">
                            ${Math.round(county.avgBill).toLocaleString('en-US')}
                          </span>
                          {county.billYear != null && (
                            <span className="ml-1 text-xs text-text-muted">
                              ({county.billYear})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  )}

                  {/* Trend sparkline */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center">
                      <Sparkline values={county.trend} />
                    </div>
                  </td>

                  {/* Expand toggle */}
                  <td className="px-4 py-3 text-text-muted">
                    {hasTowns && <Chevron open={isOpen} />}
                  </td>
                </tr>

                {/* Expanded town rows */}
                {isOpen && hasTowns && (
                  <tr key={`${county.name}-towns`} className="border-b border-border bg-primary/3">
                    <td />
                    <td colSpan={hasBillData ? 5 : 4} className="px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {county.towns.map(town => (
                          <div
                            key={town.name}
                            className="flex items-center justify-between rounded border border-border bg-bg px-3 py-2"
                          >
                            <div>
                              {town.href ? (
                                <Link
                                  href={town.href}
                                  className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                                >
                                  {town.name}
                                </Link>
                              ) : (
                                <span className="text-sm font-medium text-text">{town.name}</span>
                              )}
                            </div>
                            <div className="text-right tabular-nums text-xs text-text-muted ml-3 whitespace-nowrap">
                              {town.effectiveRatePct != null ? (
                                <>
                                  <span className="font-medium text-text">
                                    {town.effectiveRatePct.toFixed(2)}%
                                  </span>
                                  {town.rateYear != null && (
                                    <span className="ml-1">({town.rateYear})</span>
                                  )}
                                </>
                              ) : (
                                '—'
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <Link
                          href={county.countyHref}
                          className="text-xs text-primary hover:text-primary-hover"
                        >
                          View {county.name} County page →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-text-muted border-t border-border">
        Planning estimates only — individual bills depend on local assessments and exemptions.
      </p>
    </div>
  )
}
