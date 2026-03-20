import type { StateData } from '@/lib/data/types'
import { getCountyRate, getMunicipalRate } from '@/lib/rates-from-state'
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
  }
}

function calculatePropertyTaxTexas(
  input: CalculateTaxInput,
  stateData: StateData,
  mergedRelief: SelectedReliefInputs | undefined
): TaxCalculationResult {
  const { homeValue, county, town } = input
  const townDec =
    town?.trim() ? getMunicipalRate(stateData, county, town.trim()) : null
  const countyDec = getCountyRate(stateData, county)

  const reliefCompute = computeReliefAdjustments('texas', homeValue, mergedRelief)
  const taxable = reliefCompute.adjustedTaxableValue

  let annualTax: number
  let countyRatePct: number
  let municipalRatePct: number
  let base: number
  let municipalAdjustment: number
  let rateDec: number

  if (townDec != null) {
    municipalAdjustment = taxable * townDec
    base = 0
    annualTax = municipalAdjustment
    countyRatePct = 0
    municipalRatePct = townDec * 100
    rateDec = townDec
  } else if (countyDec != null) {
    base = taxable * countyDec
    municipalAdjustment = 0
    annualTax = base
    countyRatePct = countyDec * 100
    municipalRatePct = 0
    rateDec = countyDec
  } else {
    throw new Error(
      `Tax rates not found for ${county}${town?.trim() ? ` / ${town}` : ''}. Run Texas metrics sourcing and merge.`
    )
  }

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
