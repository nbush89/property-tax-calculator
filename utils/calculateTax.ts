import type { StateData } from '@/lib/data/types'
import { getCountyRate, getMunicipalRate } from '@/lib/rates-from-state'
import { getLatestValue } from '@/lib/data/metrics'
import type { SelectedReliefInputs } from '@/lib/relief/types'
import { computeReliefAdjustments, uniqueNotes } from '@/lib/calculator/applyReliefPrograms'

export type CalculateTaxInput = {
  homeValue: number
  county: string
  town?: string
  propertyType?: string
  /** @deprecated prefer reliefSelections — merged with relief for NJ legacy keys */
  exemptions?: string[]
  reliefSelections?: SelectedReliefInputs
}

export type TaxReliefSummary = {
  appliedPrograms: Array<{ programId: string; label: string; summary: string }>
  informationalProgramsSelected: Array<{ programId: string; label: string; summary: string }>
  methodologyNotes: string[]
}

/**
 * How the rate used for this estimate was derived.
 *
 * - `'comptroller'`  — Texas Comptroller per-taxing-unit rate (city or county only;
 *   does NOT include school district / MUD / hospital district). Will underestimate
 *   the combined homeowner bill.
 * - `'acs_implied'`  — Rate implied from ACS median taxes paid ÷ median home value.
 *   Reflects the combined bill across all overlapping taxing units, net of typical
 *   homestead exemptions. More accurate for Texas calculator estimates.
 * - `'state_records'` — Rate from state tax records (e.g. NJ GTR).
 */
export type RateSource = 'comptroller' | 'acs_implied' | 'state_records'

export type TaxCalculationResult = {
  homeValue: number
  /** Taxable value used after homestead-style adjustments (Texas); else same as homeValue */
  taxableValueUsed: number
  countyRate: number
  municipalRate: number
  totalRate: number
  annualTax: number
  monthlyTax: number
  effectiveRate: number
  /** Flat credits / deductions from estimate (NJ illustrative credits), dollars */
  exemptions: number
  finalTax: number
  /** Tax at full home value before taxable-value relief (Texas) — for comparison */
  baseAnnualTaxBeforeRelief?: number
  breakdown: {
    base: number
    municipalAdjustment: number
    subtotal: number
    exemptions: number
    final: number
  }
  county: string
  relief?: TaxReliefSummary
  /**
   * How the effective rate was derived. Present on all results; drives UI labeling
   * in TaxResults so users understand the basis of the estimate.
   */
  rateSource?: RateSource
  /**
   * Short note explaining the rate basis (shown in TaxResults for transparency).
   * Only populated when the source warrants a user-visible explanation.
   */
  rateSourceNote?: string
}

/** Map legacy NJ exemption checkbox ids to relief program ids */
function mergeNjLegacyExemptions(
  relief: SelectedReliefInputs | undefined,
  exemptions: string[] | undefined
): SelectedReliefInputs | undefined {
  const out: SelectedReliefInputs = { ...(relief ?? {}) }
  for (const id of exemptions ?? []) {
    if (id === 'veteran') out.nj_credit_veteran = true
    if (id === 'disabled') out.nj_credit_disabled = true
    // `senior_freeze` in old JSON was not the real PTR program — no auto credit
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Calculate property tax using rates from state data (e.g. data/states/new-jersey.json).
 */
export function calculatePropertyTax(
  input: CalculateTaxInput,
  stateData: StateData | null
): TaxCalculationResult {
  const stateSlug = stateData?.state?.slug ?? ''
  const { homeValue, county, town } = input

  const mergedRelief =
    stateSlug === 'new-jersey'
      ? mergeNjLegacyExemptions(input.reliefSelections, input.exemptions)
      : input.reliefSelections

  if (stateSlug === 'texas') {
    return calculatePropertyTaxTexas(input, stateData!, mergedRelief)
  }

  return calculatePropertyTaxNj(input, stateData, mergedRelief)
}

function calculatePropertyTaxNj(
  input: CalculateTaxInput,
  stateData: StateData | null,
  mergedRelief: SelectedReliefInputs | undefined
): TaxCalculationResult {
  const { homeValue, county, town } = input

  const countyRate = getCountyRate(stateData, county)
  const municipalRate = town ? getMunicipalRate(stateData, county, town) : null

  if (countyRate === null) {
    throw new Error(`Tax rates not found for ${county} County`)
  }

  const taxableValueUsed = Math.max(0, homeValue)
  const base = taxableValueUsed * countyRate
  const municipalAdjustment = town && municipalRate !== null ? taxableValueUsed * municipalRate : 0
  const subtotal = base + municipalAdjustment

  const reliefCompute = computeReliefAdjustments('new-jersey', homeValue, mergedRelief)
  const creditTotal = reliefCompute.taxCreditFlatTotal
  const annualTax = Math.max(subtotal - creditTotal, 0)
  const monthlyTax = annualTax / 12
  const effectiveRate = homeValue > 0 ? (annualTax / homeValue) * 100 : 0
  const totalRate = countyRate + (municipalRate ?? 0)

  const reliefSummary = buildReliefSummary(reliefCompute)

  return {
    homeValue,
    taxableValueUsed,
    countyRate: countyRate * 100,
    municipalRate: (municipalRate ?? 0) * 100,
    totalRate: totalRate * 100,
    annualTax,
    monthlyTax,
    effectiveRate,
    exemptions: creditTotal,
    finalTax: annualTax,
    breakdown: {
      base,
      municipalAdjustment,
      subtotal,
      exemptions: creditTotal,
      final: annualTax,
    },
    county,
    relief: reliefSummary,
    rateSource: 'state_records' as RateSource,
  }
}

/**
 * Derive a combined effective rate for a Texas town from ACS data.
 *
 * Uses medianTaxesPaid (ACS B25103_001E — median real estate taxes paid) divided
 * by medianHomeValue (ACS DP04_0089E). This implied rate reflects all overlapping
 * taxing units (county + city + school district + special districts) and is the
 * correct basis for a homeowner bill estimate, unlike the Comptroller per-unit rate.
 *
 * Returns null if either metric is missing or medianHomeValue is zero.
 */
function getTexasTownImpliedRate(
  stateData: StateData,
  countyName: string,
  townName: string
): number | null {
  const county = stateData.counties.find(
    c => c.name.toLowerCase() === countyName.toLowerCase()
  )
  const town = county?.towns?.find(
    t => t.name.toLowerCase() === townName.toLowerCase()
  )
  if (!town?.metrics) return null

  const bill = getLatestValue(town.metrics.medianTaxesPaid)
  const mhv = getLatestValue(town.metrics.medianHomeValue)
  if (bill == null || mhv == null || mhv <= 0) return null

  return bill / mhv
}

function calculatePropertyTaxTexas(
  input: CalculateTaxInput,
  stateData: StateData,
  mergedRelief: SelectedReliefInputs | undefined
): TaxCalculationResult {
  const { homeValue, county, town } = input

  const reliefCompute = computeReliefAdjustments('texas', homeValue, mergedRelief)
  const taxable = reliefCompute.adjustedTaxableValue

  let rateDec: number
  let rateSource: RateSource
  let rateSourceNote: string | undefined
  let countyRatePct: number
  let municipalRatePct: number

  // Prefer ACS-implied combined rate for towns: covers all overlapping taxing units.
  const impliedRate = town?.trim()
    ? getTexasTownImpliedRate(stateData, county, town.trim())
    : null

  if (impliedRate != null) {
    rateDec = impliedRate
    rateSource = 'acs_implied'
    rateSourceNote =
      'Rate implied from ACS median taxes paid ÷ median home value. ' +
      'Reflects all taxing units (county, city, school district, special districts) ' +
      'net of typical exemptions. Based on survey data; individual bills vary.'
    countyRatePct = 0
    municipalRatePct = impliedRate * 100
  } else {
    // Fallback: Comptroller per-unit rate (city, then county).
    const townDec = town?.trim() ? getMunicipalRate(stateData, county, town.trim()) : null
    const countyDec = getCountyRate(stateData, county)

    if (townDec != null) {
      rateDec = townDec
      countyRatePct = 0
      municipalRatePct = townDec * 100
    } else if (countyDec != null) {
      rateDec = countyDec
      countyRatePct = countyDec * 100
      municipalRatePct = 0
    } else {
      throw new Error(
        `Tax rates not found for ${county}${town?.trim() ? ` / ${town}` : ''}. Run Texas metrics sourcing and merge.`
      )
    }
    rateSource = 'comptroller'
    rateSourceNote =
      'Rate from Texas Comptroller (single taxing unit only — does not include ' +
      'school district or special districts). This estimate will understate the ' +
      'typical combined bill. Run the sourcing pipeline to populate ACS data.'
  }

  const annualTax = taxable * rateDec
  const base = countyRatePct > 0 ? taxable * (countyRatePct / 100) : annualTax
  const municipalAdjustment = municipalRatePct > 0 ? taxable * (municipalRatePct / 100) : 0
  const baseAnnualTaxBeforeRelief = Math.max(0, homeValue * rateDec)
  const monthlyTax = annualTax / 12
  const effectiveRate = homeValue > 0 ? (annualTax / homeValue) * 100 : 0
  const totalRatePct = countyRatePct + municipalRatePct

  const reliefSummary = buildReliefSummary(reliefCompute)

  return {
    homeValue,
    taxableValueUsed: taxable,
    countyRate: countyRatePct,
    municipalRate: municipalRatePct,
    totalRate: totalRatePct,
    annualTax,
    monthlyTax,
    effectiveRate,
    exemptions: 0,
    finalTax: annualTax,
    baseAnnualTaxBeforeRelief,
    breakdown: {
      base,
      municipalAdjustment,
      subtotal: annualTax,
      exemptions: 0,
      final: annualTax,
    },
    county,
    relief: reliefSummary,
    rateSource,
    rateSourceNote,
  }
}

function buildReliefSummary(
  r: ReturnType<typeof computeReliefAdjustments>
): TaxCalculationResult['relief'] | undefined {
  const notes = uniqueNotes(r.methodologyNotes)
  if (r.appliedPrograms.length === 0 && r.informationalProgramsSelected.length === 0 && notes.length === 0) {
    return undefined
  }
  return {
    appliedPrograms: r.appliedPrograms.map(p => ({
      programId: p.programId,
      label: p.label,
      summary: p.summary,
    })),
    informationalProgramsSelected: r.informationalProgramsSelected.map(p => ({
      programId: p.programId,
      label: p.label,
      summary: p.summary,
    })),
    methodologyNotes: notes,
  }
}
