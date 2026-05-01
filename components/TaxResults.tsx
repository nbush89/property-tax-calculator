'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber } from '@/utils/formatting'
import { Card, CardContent } from '@/components/ui/Card'
import CalculatorTaxTrendsChart from '@/components/charts/CalculatorTaxTrendsChart'
import { getCountyAvgTaxBillSeries } from '@/utils/getCountySeries'
import type { TaxCalculationResult } from '@/utils/calculateTax'
import { getInformationalPrograms } from '@/lib/relief/stateReliefConfigs'

type TaxResultsProps = {
  /** State slug for loading county trend series (default: new-jersey) */
  stateSlug?: string
}

export default function TaxResults({ stateSlug = 'new-jersey' }: TaxResultsProps) {
  const [result, setResult] = useState<TaxCalculationResult | null>(null)
  const [countySeries, setCountySeries] = useState<Array<{ year: number; value: number }>>([])

  useEffect(() => {
    const handleTaxCalculated = (event: CustomEvent) => {
      const data = event.detail as TaxCalculationResult
      setResult(data)

      if (data.county) {
        const series = getCountyAvgTaxBillSeries(stateSlug, data.county)
        setCountySeries(series)
      } else {
        setCountySeries([])
      }
    }

    window.addEventListener('taxCalculated', handleTaxCalculated as EventListener)

    return () => {
      window.removeEventListener('taxCalculated', handleTaxCalculated as EventListener)
    }
  }, [stateSlug])

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="muted">
          Enter property information and click "Calculate Property Tax" to see results
        </p>
      </div>
    )
  }

  const hasReliefAdjustment =
    result.taxableValueUsed !== result.homeValue ||
    (result.exemptions != null && result.exemptions > 0) ||
    (result.relief?.appliedPrograms?.length ?? 0) > 0

  const showBaseVsAdjusted =
    typeof result.baseAnnualTaxBeforeRelief === 'number' &&
    result.baseAnnualTaxBeforeRelief > result.annualTax

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-text mb-6">Tax Calculation Results</h2>

      {showBaseVsAdjusted && (
        <div className="rounded-lg border border-border bg-surface/80 px-4 py-3 text-sm text-text-muted">
          <p>
            <span className="font-medium text-text">Base estimate (full value): </span>
            {formatCurrency(result.baseAnnualTaxBeforeRelief!)}
          </p>
          <p className="mt-1">
            <span className="font-medium text-text">After selected exemption (estimate): </span>
            {formatCurrency(result.annualTax)}
          </p>
        </div>
      )}

      <Card className="bg-primary-soft border-primary/20">
        <CardContent className="text-center py-6">
          <p className="text-sm muted mb-2">
            {hasReliefAdjustment
              ? 'Estimated annual property tax (adjusted)'
              : 'Annual property tax'}
          </p>
          <p className="text-4xl font-bold text-primary tabular-nums">
            {formatCurrency(result.annualTax)}
          </p>
          <p className="text-sm muted mt-2 tabular-nums">
            {formatCurrency(result.monthlyTax)} per month
          </p>
        </CardContent>
      </Card>

      {result.taxableValueUsed !== result.homeValue && (
        <div className="rounded-lg border border-primary/20 bg-primary-soft/10 px-4 py-3 text-sm">
          <p className="font-medium text-text">Adjusted taxable value (estimate)</p>
          <p className="mt-1 tabular-nums text-text">{formatCurrency(result.taxableValueUsed)}</p>
          <p className="mt-1 text-xs text-text-muted">
            Entered home value: {formatCurrency(result.homeValue)}. Exemptions that reduce taxable
            value are applied before the rate (where modeled).
          </p>
        </div>
      )}

      {result.relief &&
        (result.relief.appliedPrograms.length > 0 || result.relief.methodologyNotes.length > 0) && (
          <div className="rounded-lg border border-border bg-bg px-4 py-3 text-sm space-y-2">
            {result.relief.appliedPrograms.length > 0 && (
              <div>
                <p className="font-medium text-text">Included in this estimate</p>
                <ul className="mt-1 list-disc pl-5 text-text-muted space-y-1">
                  {result.relief.appliedPrograms.map(p => (
                    <li key={p.programId}>
                      <span className="text-text font-medium">{p.label}</span>
                      {p.summary ? ` — ${p.summary}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.relief.informationalProgramsSelected.length > 0 && (
              <div>
                <p className="font-medium text-text">
                  Selected for reference (not in number above)
                </p>
                <ul className="mt-1 list-disc pl-5 text-text-muted space-y-1">
                  {result.relief.informationalProgramsSelected.map(p => (
                    <li key={p.programId}>
                      <span className="text-text font-medium">{p.label}</span>
                      {p.summary ? ` — ${p.summary}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(getInformationalPrograms(stateSlug).length > 0 ||
              result.relief.methodologyNotes.length > 0) && (
              <p className="text-xs text-text-muted border-t border-border pt-2 mt-2">
                Additional state relief programs may apply but are not fully modeled here.{' '}
                {(result.relief.informationalProgramsSelected?.length ?? 0) === 0 &&
                  getInformationalPrograms(stateSlug).length > 0 && (
                    <>
                      Open “Exemptions and tax relief” for programs that need official
                      verification.{' '}
                    </>
                  )}
                Confirm eligibility with your tax authority.
              </p>
            )}
            {result.relief.methodologyNotes.length > 0 && (
              <ul className="text-xs text-text-muted list-disc pl-5 space-y-1 pt-1">
                {result.relief.methodologyNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}

      <div className="space-y-4">
        <div className="border-b border-border pb-4">
          <h3 className="font-semibold text-text mb-3">Tax Rates</h3>
          {result.rateSource === 'acs_implied' ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="muted">Combined effective rate</p>
                <p className="font-medium text-text text-lg tabular-nums">
                  {formatNumber(result.effectiveRate, 3)}%
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Derived from Census ACS data (median taxes paid ÷ median home value).
                  Reflects all overlapping taxing units — county, city, school district, and
                  special districts. Individual bills vary based on location, exemptions, and
                  assessed value.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="muted">County Rate</p>
                <p className="font-medium text-text tabular-nums">
                  {formatNumber(result.countyRate)}%
                </p>
              </div>
              {result.municipalRate > 0 && (
                <div>
                  <p className="muted">Municipal Rate</p>
                  <p className="font-medium text-text tabular-nums">
                    {formatNumber(result.municipalRate)}%
                  </p>
                </div>
              )}
              <div className="col-span-2">
                <p className="muted">Effective Tax Rate</p>
                <p className="font-medium text-text text-lg tabular-nums">
                  {formatNumber(result.effectiveRate, 3)}%
                </p>
              </div>
              {result.rateSource === 'comptroller' && (
                <div className="col-span-2 rounded border border-warning/30 bg-warning/10 px-3 py-2">
                  <p className="text-xs text-warning">
                    This rate covers only one taxing unit and does not include school district
                    or special district levies. Your actual bill will be higher.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-border pb-4">
          <h3 className="font-semibold text-text mb-3">Tax Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="muted">Base Tax (County)</span>
              <span className="font-medium text-text tabular-nums">
                {formatCurrency(result.breakdown.base)}
              </span>
            </div>
            {result.breakdown.municipalAdjustment > 0 && (
              <div className="flex justify-between">
                <span className="muted">Municipal Adjustment</span>
                <span className="font-medium text-text tabular-nums">
                  {formatCurrency(result.breakdown.municipalAdjustment)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2">
              <span className="muted font-medium">Subtotal</span>
              <span className="font-medium text-text tabular-nums">
                {formatCurrency(result.breakdown.subtotal)}
              </span>
            </div>
            {result.exemptions > 0 && (
              <div className="flex justify-between text-success">
                <span>Credits / deductions (estimate)</span>
                <span className="font-medium tabular-nums">
                  -{formatCurrency(result.exemptions)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span className="text-text">Final Annual Tax</span>
              <span className="text-text tabular-nums">{formatCurrency(result.finalTax)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-text mb-3">Property Value</h3>
          <p className="text-lg font-medium text-text tabular-nums">
            {formatCurrency(result.homeValue)}
          </p>
        </div>
      </div>

      {result.county && countySeries.length >= 3 ? (
        <CalculatorTaxTrendsChart series={countySeries} countyName={result.county} />
      ) : (
        <div className="mt-6">
          <h3 className="font-semibold text-text mb-3">Tax Trend</h3>
          <p className="text-sm text-text-muted">
            Historical county trends are available where year-labeled data exists.
          </p>
        </div>
      )}
    </div>
  )
}
