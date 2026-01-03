'use client'

import { useState, useEffect } from 'react'
import ChartWrapper from './ChartWrapper'
import { formatCurrency, formatNumber } from '@/utils/formatting'
import { Card, CardContent } from '@/components/ui/Card'

type TaxResult = {
  homeValue: number
  countyRate: number
  municipalRate: number
  totalRate: number
  annualTax: number
  monthlyTax: number
  effectiveRate: number
  exemptions: number
  finalTax: number
  breakdown: {
    base: number
    municipalAdjustment: number
    subtotal: number
    exemptions: number
    final: number
  }
  trendData: {
    years: string[]
    values: number[]
  }
}

export default function TaxResults() {
  const [result, setResult] = useState<TaxResult | null>(null)

  useEffect(() => {
    const handleTaxCalculated = (event: CustomEvent) => {
      setResult(event.detail)
    }

    window.addEventListener('taxCalculated', handleTaxCalculated as EventListener)
    
    return () => {
      window.removeEventListener('taxCalculated', handleTaxCalculated as EventListener)
    }
  }, [])

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="muted">
          Enter property information and click "Calculate Property Tax" to see results
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-text mb-6">
        Tax Calculation Results
      </h2>

      <Card className="bg-primary-soft border-primary/20">
        <CardContent className="text-center py-6">
          <p className="text-sm muted mb-2">Annual Property Tax</p>
          <p className="text-4xl font-bold text-primary tabular-nums">
            {formatCurrency(result.annualTax)}
          </p>
          <p className="text-sm muted mt-2 tabular-nums">
            {formatCurrency(result.monthlyTax)} per month
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="border-b border-border pb-4">
          <h3 className="font-semibold text-text mb-3">Tax Rates</h3>
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
          </div>
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
                <span>Exemptions</span>
                <span className="font-medium tabular-nums">-{formatCurrency(result.exemptions)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span className="text-text">Final Annual Tax</span>
              <span className="text-text tabular-nums">
                {formatCurrency(result.finalTax)}
              </span>
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

      <div className="mt-6">
        <ChartWrapper data={result} />
      </div>
    </div>
  )
}
