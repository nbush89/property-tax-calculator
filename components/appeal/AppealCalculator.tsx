'use client'

import { useState, useMemo } from 'react'
import type { AffiliateCta } from '@/lib/affiliates/affiliateConfig'

interface AppealCalculatorProps {
  /** Map of county name → effective rate as decimal (e.g. 0.0235 for 2.35%) */
  countyRates: Record<string, number>
  /** State name for display copy */
  stateName: string
  /** State abbreviation */
  stateAbbrev: string
  /** Ownwell appeal CTA config — shown in results when enabled */
  appealCta: AffiliateCta
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtRate(r: number): string {
  return `${(r * 100).toFixed(3)}%`
}

type ResultState =
  | { kind: 'idle' }
  | { kind: 'not-over-assessed'; assessed: number; market: number; rate: number }
  | {
      kind: 'over-assessed'
      assessed: number
      market: number
      gap: number
      gapPct: number
      annualOverpayment: number
      rate: number
      county: string
    }

export default function AppealCalculator({
  countyRates,
  stateName,
  stateAbbrev,
  appealCta,
}: AppealCalculatorProps) {
  const [county, setCounty] = useState('')
  const [assessedRaw, setAssessedRaw] = useState('')
  const [marketRaw, setMarketRaw] = useState('')

  const countyList = useMemo(
    () => Object.keys(countyRates).sort(),
    [countyRates]
  )

  const result = useMemo<ResultState>(() => {
    const assessed = parseFloat(assessedRaw.replace(/[^0-9.]/g, ''))
    const market = parseFloat(marketRaw.replace(/[^0-9.]/g, ''))
    const rate = county ? countyRates[county] : null

    if (!assessed || !market || !rate || assessed <= 0 || market <= 0) return { kind: 'idle' }

    if (assessed <= market) {
      return { kind: 'not-over-assessed', assessed, market, rate }
    }

    const gap = assessed - market
    const gapPct = (gap / market) * 100
    const annualOverpayment = gap * rate

    return {
      kind: 'over-assessed',
      assessed,
      market,
      gap,
      gapPct,
      annualOverpayment,
      rate,
      county,
    }
  }, [county, assessedRaw, marketRaw, countyRates])

  return (
    <div>
      {/* Inputs */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label
            htmlFor="appeal-county"
            className="block text-sm font-medium text-text mb-1"
          >
            County
          </label>
          <select
            id="appeal-county"
            value={county}
            onChange={e => setCounty(e.target.value)}
            className="w-full rounded-md border border-border bg-surface text-text px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select county…</option>
            {countyList.map(c => (
              <option key={c} value={c}>
                {c} County ({fmtRate(countyRates[c])})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="appeal-assessed"
            className="block text-sm font-medium text-text mb-1"
          >
            Assessed value
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              $
            </span>
            <input
              id="appeal-assessed"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 450,000"
              value={assessedRaw}
              onChange={e => setAssessedRaw(e.target.value)}
              className="w-full rounded-md border border-border bg-surface text-text pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-text-muted mt-1">
            From your latest tax assessment notice
          </p>
        </div>

        <div>
          <label
            htmlFor="appeal-market"
            className="block text-sm font-medium text-text mb-1"
          >
            Estimated market value
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              $
            </span>
            <input
              id="appeal-market"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 400,000"
              value={marketRaw}
              onChange={e => setMarketRaw(e.target.value)}
              className="w-full rounded-md border border-border bg-surface text-text pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-text-muted mt-1">
            Recent sale of your home or comparable properties
          </p>
        </div>
      </div>

      {/* Results */}
      {result.kind === 'idle' && (
        <div className="rounded-lg border border-border bg-surface p-5 text-sm text-text-muted">
          Enter your county, assessed value, and estimated market value above to see your
          over-assessment estimate.
        </div>
      )}

      {result.kind === 'not-over-assessed' && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="font-semibold text-text mb-1">
            Your assessed value appears to be at or below market value.
          </p>
          <p className="text-sm text-text-muted">
            Assessed: {fmt(result.assessed)} · Market estimate: {fmt(result.market)} · Rate:{' '}
            {fmtRate(result.rate)}
          </p>
          <p className="text-sm text-text-muted mt-2">
            A property tax appeal is unlikely to lower your bill in this case — the assessor
            would need to find your home under-assessed relative to market value. If you
            believe the market value estimate is lower, adjust it above and recalculate.
          </p>
        </div>
      )}

      {result.kind === 'over-assessed' && (
        <div className="space-y-4">
          {/* Key numbers */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface border border-border p-4">
              <p className="text-xs text-text-muted mb-1">Over-assessment</p>
              <p className="text-2xl font-semibold text-text">{fmt(result.gap)}</p>
              <p className="text-xs text-text-muted mt-1">
                {result.gapPct.toFixed(1)}% above estimated market value
              </p>
            </div>
            <div className="rounded-lg bg-surface border border-amber-300 dark:border-amber-700 p-4">
              <p className="text-xs text-text-muted mb-1">Estimated annual overpayment</p>
              <p className="text-2xl font-semibold text-amber-700 dark:text-amber-400">
                {fmt(result.annualOverpayment)}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Using {result.county} County rate of {fmtRate(result.rate)}
              </p>
            </div>
            <div className="rounded-lg bg-surface border border-green-300 dark:border-green-700 p-4">
              <p className="text-xs text-text-muted mb-1">Potential 5-year savings</p>
              <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
                {fmt(result.annualOverpayment * 5)}
              </p>
              <p className="text-xs text-text-muted mt-1">
                If appeal succeeds and assessment holds
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            <p>
              <span className="font-medium text-text">How this is calculated:</span> Over-assessment
              of {fmt(result.gap)} × {result.county} County effective rate of{' '}
              {fmtRate(result.rate)} = {fmt(result.annualOverpayment)}/year. This is an estimate
              — actual savings depend on the new assessed value set by the board, any exemptions,
              and whether all taxing units reduce their rates proportionally.
            </p>
          </div>

          {/* CTA */}
          {appealCta.enabled ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
              <p className="font-semibold text-text mb-1">
                You may be overpaying ~{fmt(result.annualOverpayment)}/year
              </p>
              <p className="text-sm text-text-muted mb-3">{appealCta.description}</p>
              <a
                href={appealCta.url}
                rel="noopener noreferrer sponsored"
                target="_blank"
                className="inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                {appealCta.label}
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
              <p className="font-medium text-text mb-1">Next steps</p>
              <p>
                If your assessed value exceeds market value by {fmt(result.gap)}, you may have
                grounds for an appeal. Contact your county assessor's office or a local property
                tax attorney to review your options and confirm the current filing deadline.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-text-muted mt-4">
        Estimates are for planning purposes only. Actual savings depend on the outcome of your
        appeal, exemptions, and local levy decisions. Not legal or tax advice.
      </p>
    </div>
  )
}
