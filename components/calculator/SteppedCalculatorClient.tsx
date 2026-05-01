'use client'

import { useState, useCallback, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { slugifyLocation } from '@/utils/locationUtils'
import { getCalculatorAdjustablePrograms, getInformationalPrograms } from '@/lib/relief/stateReliefConfigs'
import type { StateOptionForHero } from '@/lib/geo'
import type { PreviewMetricsMap } from '@/lib/calculator/previewMetrics'
import type { TaxCalculationResult } from '@/utils/calculateTax'
import type { SelectedReliefInputs } from '@/lib/relief/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'commercial', label: 'Commercial' },
] as const

const STEP_LABELS = ['Location', 'Property', 'Refine']

type Step = 1 | 2 | 3 | 'results'

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SteppedCalculatorClientProps {
  states: StateOptionForHero[]
  previewMetrics: PreviewMetricsMap
  initialStateSlug?: string
  initialCountySlug?: string
  initialTownSlug?: string
  initialHomeValue?: string
  /** Hide state selector when state is pre-determined (e.g. /[state]/property-tax-calculator) */
  lockState?: boolean
  pageType?: 'calculator' | 'hero' | 'state' | 'county' | 'town' | 'blog' | 'static'
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtRate(n: number) {
  return n.toFixed(2) + '%'
}

// ─── Stepper header ───────────────────────────────────────────────────────────

function StepperHeader({ step }: { step: Step }) {
  const activeNum = step === 'results' ? 4 : (step as number)
  return (
    <div className="calc-stepper mb-8" aria-label="Calculator steps">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1
        const isDone = num < activeNum || step === 'results'
        const isActive = num === activeNum
        return (
          <div
            key={label}
            className={`calc-step${isDone ? ' cs-done' : ''}${isActive ? ' cs-active' : ''}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="cs-num">
              {isDone ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                num
              )}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Live preview sidebar ──────────────────────────────────────────────────────

interface PreviewSidebarProps {
  step: Step
  stateSlug: string
  countySlug: string
  homeValue: string
  result: TaxCalculationResult | null
  previewMetrics: PreviewMetricsMap
  whatIfValue: number
  onWhatIfChange: (v: number) => void
}

function PreviewSidebar({
  step,
  stateSlug,
  countySlug,
  homeValue,
  result,
  previewMetrics,
  whatIfValue,
  onWhatIfChange,
}: PreviewSidebarProps) {
  const stateMetrics = previewMetrics[stateSlug]
  const countyMetrics = stateMetrics?.counties[countySlug]
  const homeNum = parseFloat(homeValue.replace(/,/g, '')) || 0

  // Quick estimate before API call
  const ratePct = countyMetrics?.effectiveRatePct ?? stateMetrics?.avgRatePct ?? null
  const estimate = ratePct != null && homeNum > 0 ? (homeNum * ratePct) / 100 : null

  // Comparison values
  const countyAvgBill = countyMetrics?.avgBill ?? null
  const stateAvgBill = stateMetrics?.avgBill ?? null

  // What-if compute — normalise to decimal form (e.g. 0.0122 for 1.22%).
  // result.effectiveRate is stored in percent form (1.22 = 1.22%); ratePct is also
  // percent form; both need ÷ 100 before multiplying against a dollar value.
  const effectiveRate =
    result != null
      ? result.effectiveRate / 100
      : ratePct != null
        ? ratePct / 100
        : null
  const whatIfEstimate =
    effectiveRate != null && whatIfValue > 0
      ? whatIfValue * effectiveRate
      : null

  const displayBill = result?.annualTax ?? estimate

  if (step === 'results' && result != null) {
    // Compute bar widths
    const maxBar = Math.max(result.annualTax, countyAvgBill ?? 0, stateAvgBill ?? 0, 1)
    const youPct = (result.annualTax / maxBar) * 100
    const countyPct = countyAvgBill != null ? (countyAvgBill / maxBar) * 100 : null
    const statePct = stateAvgBill != null ? (stateAvgBill / maxBar) * 100 : null

    const minWhatIf = Math.max(50000, Math.round(result.homeValue * 0.5 / 10000) * 10000)
    const maxWhatIf = Math.round(result.homeValue * 2 / 10000) * 10000

    return (
      <div className="summary-card cs-fade" style={{ position: 'sticky', top: '80px' }}>
        {/* Hero bill */}
        <div className="cs-hero-bill mb-4">
          <div className="cs-grain" aria-hidden="true" />
          <p className="cs-eyebrow">Estimated Annual Tax</p>
          <p className="cs-big">{fmtCurrency(result.annualTax)}</p>
          <div className="cs-meta">
            <div className="cs-meta-item">
              per month
              <span>{fmtCurrency(result.monthlyTax)}</span>
            </div>
            <div className="cs-meta-item">
              effective rate
              <span>{fmtRate(result.effectiveRate)}</span>
            </div>
            {result.totalRate > 0 && result.totalRate !== result.effectiveRate && (
              <div className="cs-meta-item">
                combined rate
                <span>{fmtRate(result.totalRate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Comparison bars */}
        {(countyAvgBill != null || stateAvgBill != null) && (
          <div className="rounded-xl border border-border bg-surface p-4 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">How you compare</p>
            <div>
              <div className="cs-cmp-row">
                <span className="cs-cmp-label">Your estimate</span>
                <div className="cs-cmp-track">
                  <div className="cs-cmp-fill cs-fill-you" style={{ width: `${youPct}%` }} />
                </div>
                <span className="cs-cmp-val">{fmtCurrency(result.annualTax)}</span>
              </div>
              {countyAvgBill != null && countyPct != null && (
                <div className="cs-cmp-row">
                  <span className="cs-cmp-label">County avg</span>
                  <div className="cs-cmp-track">
                    <div className="cs-cmp-fill cs-fill-county" style={{ width: `${countyPct}%` }} />
                  </div>
                  <span className="cs-cmp-val">{fmtCurrency(countyAvgBill)}</span>
                </div>
              )}
              {stateAvgBill != null && statePct != null && (
                <div className="cs-cmp-row">
                  <span className="cs-cmp-label">State avg</span>
                  <div className="cs-cmp-track">
                    <div className="cs-cmp-fill cs-fill-state" style={{ width: `${statePct}%` }} />
                  </div>
                  <span className="cs-cmp-val">{fmtCurrency(stateAvgBill)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What-if slider */}
        {effectiveRate != null && (
          <div className="rounded-xl border border-border bg-surface p-4 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">What if my home value were…</p>
            <p className="text-sm text-text-muted mb-3">{fmtCurrency(whatIfValue)}</p>
            <input
              type="range"
              min={minWhatIf}
              max={maxWhatIf}
              step={10000}
              value={whatIfValue}
              onChange={e => onWhatIfChange(Number(e.target.value))}
              aria-label="What-if home value"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>{fmtCurrency(minWhatIf)}</span>
              <span>{fmtCurrency(maxWhatIf)}</span>
            </div>
            {whatIfEstimate != null && (
              <p className="mt-3 text-sm font-medium text-text tabular-nums">
                ≈ {fmtCurrency(whatIfEstimate)}/yr
                <span className="font-normal text-text-muted"> · {fmtCurrency(whatIfEstimate / 12)}/mo</span>
              </p>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-text-muted leading-relaxed">
          Planning estimate based on published rates. Individual bills depend on local assessments and exemptions. Verify with your local assessor.
        </p>
      </div>
    )
  }

  // Pre-results sidebar: live estimate
  return (
    <div className="summary-card" style={{ position: 'sticky', top: '80px' }}>
      {displayBill != null ? (
        <div className="cs-hero-bill cs-fade">
          <div className="cs-grain" aria-hidden="true" />
          <p className="cs-eyebrow">Live estimate</p>
          <p className="cs-big">{fmtCurrency(displayBill)}</p>
          <div className="cs-meta">
            <div className="cs-meta-item">
              per month
              <span>{fmtCurrency(displayBill / 12)}</span>
            </div>
            {ratePct != null && (
              <div className="cs-meta-item">
                rate used
                <span>{fmtRate(ratePct)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-bg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" className="text-text-muted" />
              <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-muted" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">
            {!stateSlug
              ? 'Select a state to start'
              : !countySlug
                ? 'Select a county to see an estimate'
                : 'Enter your home value to see an estimate'}
          </p>
        </div>
      )}
      {displayBill != null && (
        <p className="mt-3 text-xs text-text-muted leading-relaxed">
          Rough estimate from county effective rate. Complete all steps for a detailed breakdown.
        </p>
      )}
    </div>
  )
}

// ─── Step 1: Location ─────────────────────────────────────────────────────────

interface Step1Props {
  states: StateOptionForHero[]
  stateSlug: string
  countySlug: string
  townSlug: string
  lockState: boolean
  onStateChange: (v: string) => void
  onCountyChange: (v: string) => void
  onTownChange: (v: string) => void
  onContinue: () => void
  pageType: string
}

function Step1Location({
  states,
  stateSlug,
  countySlug,
  townSlug,
  lockState,
  onStateChange,
  onCountyChange,
  onTownChange,
  onContinue,
  pageType,
}: Step1Props) {
  const selectedState = states.find(s => s.slug === stateSlug)
  const counties = selectedState?.counties ?? []
  const selectedCounty = counties.find(c => c.slug === countySlug)
  const towns = selectedCounty?.towns ?? []
  const canContinue = !!stateSlug && !!countySlug

  return (
    <div className="cs-fade space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text mb-1">Where is your property?</h2>
        <p className="text-sm text-text-muted">Select your state and county to continue.</p>
      </div>

      {!lockState && (
        <div>
          <label className="block text-sm font-medium text-text mb-2">State *</label>
          <select
            value={stateSlug}
            onChange={e => onStateChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Select state"
          >
            <option value="">Select state…</option>
            {states.map(s => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-2">County *</label>
        <select
          value={countySlug}
          onChange={e => onCountyChange(e.target.value)}
          disabled={!stateSlug || counties.length === 0}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          aria-label="Select county"
        >
          <option value="">
            {!stateSlug ? 'Select state first' : counties.length === 0 ? 'No counties' : 'Select county…'}
          </option>
          {counties.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Municipality <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <select
          value={townSlug}
          onChange={e => onTownChange(e.target.value)}
          disabled={!countySlug || towns.length === 0}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          aria-label="Select town"
        >
          <option value="">
            {!countySlug ? 'Select county first' : towns.length === 0 ? 'No towns listed' : 'Select town (optional)…'}
          </option>
          {towns.map(t => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-text-muted">
          A more precise rate is used when a town is selected; otherwise the county rate applies.
        </p>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to property details →
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Property ─────────────────────────────────────────────────────────

interface Step2Props {
  stateSlug: string
  homeValue: string
  propertyType: string
  onHomeValueChange: (v: string) => void
  onPropertyTypeChange: (v: string) => void
  onBack: () => void
  onContinue: () => void
  error?: string
}

function Step2Property({
  stateSlug,
  homeValue,
  propertyType,
  onHomeValueChange,
  onPropertyTypeChange,
  onBack,
  onContinue,
  error,
}: Step2Props) {
  const isNj = stateSlug === 'new-jersey'
  const canContinue = !!homeValue && parseFloat(homeValue) > 0

  return (
    <div className="cs-fade space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text mb-1">Property details</h2>
        <p className="text-sm text-text-muted">Enter your home value for the tax estimate.</p>
      </div>

      <div>
        <label htmlFor="sc-home-value" className="block text-sm font-medium text-text mb-2">
          Home Value ($) *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">$</span>
          <input
            type="number"
            id="sc-home-value"
            value={homeValue}
            onChange={e => onHomeValueChange(e.target.value)}
            placeholder="e.g. 450000"
            min="0"
            step="1000"
            className="w-full rounded-lg border border-border bg-surface pl-7 pr-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-invalid={!!error}
            aria-describedby={error ? 'home-value-error' : undefined}
          />
        </div>
        {error && (
          <p id="home-value-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {isNj && (
        <div>
          <label htmlFor="sc-property-type" className="block text-sm font-medium text-text mb-2">
            Property Type
          </label>
          <select
            id="sc-property-type"
            value={propertyType}
            onChange={e => onPropertyTypeChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {PROPERTY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-bg transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Refine (relief programs) ────────────────────────────────────────

interface Step3Props {
  stateSlug: string
  reliefSelections: SelectedReliefInputs
  onToggle: (programId: string, checked: boolean) => void
  onBack: () => void
  onCalculate: () => void
  isCalculating: boolean
}

function Step3Refine({ stateSlug, reliefSelections, onToggle, onBack, onCalculate, isCalculating }: Step3Props) {
  const adjustable = getCalculatorAdjustablePrograms(stateSlug)
  const informational = getInformationalPrograms(stateSlug)

  return (
    <div className="cs-fade space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text mb-1">Exemptions &amp; relief</h2>
        <p className="text-sm text-text-muted">
          Select any programs you may qualify for. These adjust your estimate.
        </p>
      </div>

      {adjustable.length > 0 && (
        <div className="space-y-3">
          {adjustable.map(program => {
            const checked = reliefSelections[program.id] === true
            return (
              <label
                key={program.id}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                  checked ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-border/80 hover:bg-bg'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-primary"
                  checked={checked}
                  onChange={e => onToggle(program.id, e.target.checked)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{program.name}</p>
                  {program.description && (
                    <p className="mt-0.5 text-xs text-text-muted leading-relaxed">{program.description}</p>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}

      {informational.length > 0 && (
        <div className="rounded-xl border border-border bg-bg/50 p-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
            Additional programs (for reference only)
          </p>
          <div className="space-y-2">
            {informational.map(program => (
              <div key={program.id} className="flex gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-primary"
                  checked={reliefSelections[program.id] === true}
                  onChange={e => onToggle(program.id, e.target.checked)}
                />
                <div>
                  <p className="text-sm font-medium text-text">{program.name}</p>
                  {program.description && (
                    <p className="text-xs text-text-muted leading-relaxed">{program.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-muted border-t border-border pt-2">
            These programs are shown for reference. Check eligibility with your local tax authority.
          </p>
        </div>
      )}

      {adjustable.length === 0 && informational.length === 0 && (
        <div className="cs-note">
          <span>ℹ</span>
          <span>No adjustable relief programs are currently modeled for this state. Your estimate uses the published county rate.</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-bg transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onCalculate}
          disabled={isCalculating}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isCalculating ? 'Calculating…' : 'Calculate my tax estimate'}
        </button>
      </div>
    </div>
  )
}

// ─── Results step ─────────────────────────────────────────────────────────────

interface ResultsStepProps {
  result: TaxCalculationResult
  countyName: string
  townName: string
  stateSlug: string
  countySlug: string
  onStartOver: () => void
  onAdjust: () => void
}

function ResultsStep({ result, countyName, townName, stateSlug, countySlug, onStartOver, onAdjust }: ResultsStepProps) {
  const hasRelief =
    (result.relief?.appliedPrograms?.length ?? 0) > 0 ||
    (result.relief?.informationalProgramsSelected?.length ?? 0) > 0

  return (
    <div className="cs-fade space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Your estimate</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {townName || countyName} · {fmtCurrency(result.homeValue)}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdjust}
          className="shrink-0 text-sm data-link"
        >
          Adjust inputs
        </button>
      </div>

      {/* Rate breakdown */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-4">Rate breakdown</p>
        {result.rateSource === 'acs_implied' ? (
          <div>
            <div className="flex justify-between items-baseline py-2">
              <span className="text-sm text-text-muted">Combined effective rate (ACS)</span>
              <span className="text-sm font-semibold text-text tabular-nums">{fmtRate(result.effectiveRate)}</span>
            </div>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              Derived from Census ACS median taxes paid ÷ median home value. Reflects all overlapping taxing units.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {result.countyRate > 0 && (
              <div className="flex justify-between items-baseline py-2">
                <span className="text-sm text-text-muted">County rate</span>
                <span className="text-sm font-medium text-text tabular-nums">{fmtRate(result.countyRate)}</span>
              </div>
            )}
            {result.municipalRate > 0 && (
              <div className="flex justify-between items-baseline py-2">
                <span className="text-sm text-text-muted">Municipal rate</span>
                <span className="text-sm font-medium text-text tabular-nums">{fmtRate(result.municipalRate)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline py-2">
              <span className="text-sm font-medium text-text">Total rate</span>
              <span className="text-sm font-semibold text-text tabular-nums">{fmtRate(result.totalRate)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Relief summary */}
      {hasRelief && (
        <div className="rounded-xl border border-border bg-bg/50 p-4 text-sm space-y-2">
          {(result.relief?.appliedPrograms?.length ?? 0) > 0 && (
            <div>
              <p className="font-medium text-text mb-1">Included in this estimate</p>
              <ul className="space-y-1">
                {result.relief!.appliedPrograms.map(p => (
                  <li key={p.programId} className="flex gap-2 text-text-muted">
                    <span className="text-success mt-0.5">✓</span>
                    <span><span className="text-text font-medium">{p.label}</span>{p.summary ? ` — ${p.summary}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(result.relief?.informationalProgramsSelected?.length ?? 0) > 0 && (
            <div>
              <p className="font-medium text-text mb-1">Selected for reference only</p>
              <ul className="space-y-1">
                {result.relief!.informationalProgramsSelected.map(p => (
                  <li key={p.programId} className="text-text-muted">
                    {p.label}{p.summary ? ` — ${p.summary}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {countySlug && (
          <a
            href={`/${stateSlug}/${countySlug}-county-property-tax`}
            className="data-link"
          >
            View {countyName} County rates →
          </a>
        )}
        <a
          href={`/${stateSlug}/property-tax-rates`}
          className="data-link"
        >
          All {stateSlug.replace(/-/g, ' ')} counties →
        </a>
      </div>

      <button
        type="button"
        onClick={onStartOver}
        className="text-sm text-text-muted hover:text-text underline underline-offset-2 transition-colors"
      >
        Start over
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SteppedCalculatorClient({
  states,
  previewMetrics,
  initialStateSlug = '',
  initialCountySlug = '',
  initialTownSlug = '',
  initialHomeValue = '',
  lockState = false,
  pageType = 'calculator',
}: SteppedCalculatorClientProps) {
  // Determine if state supports calculation
  const SUPPORTED = ['new-jersey', 'texas']

  const [step, setStep] = useState<Step>(() => {
    // If state is locked (state-specific route), start at step 1 (location = county selection)
    // If we have enough pre-fill to skip to step 2, go there
    if (initialStateSlug && initialCountySlug && initialHomeValue) return 2
    if (initialStateSlug && initialCountySlug) return 2
    return 1
  })

  const [stateSlug, setStateSlug] = useState(initialStateSlug)
  const [countySlug, setCountySlug] = useState(initialCountySlug)
  const [townSlug, setTownSlug] = useState(initialTownSlug)
  const [homeValue, setHomeValue] = useState(initialHomeValue)
  const [propertyType, setPropertyType] = useState('single_family')
  const [reliefSelections, setReliefSelections] = useState<SelectedReliefInputs>({})
  const [result, setResult] = useState<TaxCalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [homeValueError, setHomeValueError] = useState('')
  const [whatIfValue, setWhatIfValue] = useState(0)

  // Derived
  const selectedState = states.find(s => s.slug === stateSlug)
  const selectedCounty = selectedState?.counties.find(c => c.slug === countySlug)
  const selectedTown = selectedCounty?.towns.find(t => t.slug === townSlug)
  const countyName = selectedCounty?.name ?? ''
  const townName = selectedTown?.name ?? ''
  const isSupported = SUPPORTED.includes(stateSlug)
  const hasReliefStep = isSupported && (
    getCalculatorAdjustablePrograms(stateSlug).length > 0 ||
    getInformationalPrograms(stateSlug).length > 0
  )

  // Sync what-if slider when result arrives
  useEffect(() => {
    if (result) setWhatIfValue(result.homeValue)
  }, [result])

  const handleStateChange = (v: string) => {
    setStateSlug(v)
    setCountySlug('')
    setTownSlug('')
    setReliefSelections({})
    setResult(null)
    if (v) trackEvent('select_state', { state: v, page_type: pageType })
  }

  const handleCountyChange = (v: string) => {
    setCountySlug(v)
    setTownSlug('')
    setResult(null)
    if (v && stateSlug) trackEvent('select_county', { state: stateSlug, county: v, page_type: pageType })
  }

  const handleTownChange = (v: string) => {
    setTownSlug(v)
    setResult(null)
    if (v && stateSlug && countySlug) trackEvent('select_town', { state: stateSlug, county: countySlug, town: v, page_type: pageType })
  }

  const handleToggleRelief = (programId: string, checked: boolean) => {
    setReliefSelections(prev => {
      const next = { ...prev }
      if (checked) next[programId] = true
      else delete next[programId]
      return next
    })
  }

  const runCalculation = useCallback(async () => {
    if (!countyName || !homeValue.trim() || !isSupported) return

    const hv = parseFloat(homeValue)
    if (isNaN(hv) || hv <= 0) {
      setHomeValueError('Please enter a valid home value greater than 0.')
      setStep(2)
      return
    }

    setIsCalculating(true)
    try {
      const response = await fetch('/api/calculate-tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeValue: hv,
          county: countyName,
          town: townName || undefined,
          propertyType,
          exemptions: [],
          reliefSelections,
          stateSlug: stateSlug || 'new-jersey',
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setResult(data)
        setStep('results')
        trackEvent('calculate_tax', {
          state: stateSlug,
          page_type: pageType,
          county: slugifyLocation(countyName),
          town: townName ? slugifyLocation(townName) : undefined,
          home_value: hv,
          property_type: propertyType,
          exemptions_count: Object.values(reliefSelections).filter(v => v === true).length,
        })
        // Also dispatch legacy event for TaxResults listeners
        window.dispatchEvent(new CustomEvent('taxCalculated', { detail: data }))
      } else {
        console.error('Tax calculation error:', data.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsCalculating(false)
    }
  }, [countyName, townName, homeValue, propertyType, reliefSelections, stateSlug, pageType, isSupported])

  const handleStep1Continue = () => {
    if (!stateSlug || !countySlug) return
    if (!isSupported) {
      // Unsupported: skip to a stub results telling them
      setStep(2)
      return
    }
    setStep(2)
  }

  const handleStep2Continue = () => {
    const hv = parseFloat(homeValue)
    if (isNaN(hv) || hv <= 0) {
      setHomeValueError('Please enter a valid home value greater than 0.')
      return
    }
    setHomeValueError('')
    if (hasReliefStep) {
      setStep(3)
    } else {
      runCalculation()
    }
  }

  const handleStep3Calculate = () => {
    runCalculation()
  }

  const handleStartOver = () => {
    setResult(null)
    setStep(1)
    if (!lockState) {
      setStateSlug(initialStateSlug)
      setCountySlug('')
      setTownSlug('')
    } else {
      setCountySlug('')
      setTownSlug('')
    }
    setHomeValue('')
    setReliefSelections({})
  }

  const handleAdjust = () => {
    setStep(2)
  }

  const activeStep = step === 'results' ? 4 : (step as number)

  return (
    <div className="calc-stepped">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
        {/* Left: wizard */}
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
          <StepperHeader step={step} />

          {step === 1 && (
            <Step1Location
              states={states}
              stateSlug={stateSlug}
              countySlug={countySlug}
              townSlug={townSlug}
              lockState={lockState}
              onStateChange={handleStateChange}
              onCountyChange={handleCountyChange}
              onTownChange={handleTownChange}
              onContinue={handleStep1Continue}
              pageType={pageType}
            />
          )}

          {step === 2 && (
            <Step2Property
              stateSlug={stateSlug}
              homeValue={homeValue}
              propertyType={propertyType}
              onHomeValueChange={v => { setHomeValue(v); setHomeValueError('') }}
              onPropertyTypeChange={setPropertyType}
              onBack={() => setStep(1)}
              onContinue={handleStep2Continue}
              error={homeValueError}
            />
          )}

          {step === 3 && (
            <Step3Refine
              stateSlug={stateSlug}
              reliefSelections={reliefSelections}
              onToggle={handleToggleRelief}
              onBack={() => setStep(2)}
              onCalculate={handleStep3Calculate}
              isCalculating={isCalculating}
            />
          )}

          {step === 'results' && result && (
            <ResultsStep
              result={result}
              countyName={countyName}
              townName={townName}
              stateSlug={stateSlug}
              countySlug={countySlug}
              onStartOver={handleStartOver}
              onAdjust={handleAdjust}
            />
          )}

          {step === 'results' && !result && (
            <div className="text-center py-8 text-text-muted text-sm">
              Loading result…
            </div>
          )}
        </div>

        {/* Right: live preview / results sidebar */}
        <PreviewSidebar
          step={step}
          stateSlug={stateSlug}
          countySlug={countySlug}
          homeValue={homeValue}
          result={result}
          previewMetrics={previewMetrics}
          whatIfValue={whatIfValue}
          onWhatIfChange={setWhatIfValue}
        />
      </div>
    </div>
  )
}
