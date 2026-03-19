import type { StateData } from '@/lib/data/types'
import { getCountyRate, getMunicipalRate } from '@/lib/rates-from-state'
import njExemptions from '@/data/nj_exemptions.json'

type CalculateTaxInput = {
  homeValue: number
  county: string
  town?: string
  propertyType?: string
  exemptions?: string[]
}

type TaxCalculationResult = {
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
  county: string
}

/**
 * Calculate property tax using rates from state data (e.g. data/states/new-jersey.json).
 * stateData must be provided (e.g. getStateData('new-jersey')) — static rate files are no longer used.
 */
export function calculatePropertyTax(
  input: CalculateTaxInput,
  stateData: StateData | null
): TaxCalculationResult {
  const { homeValue, county, town, exemptions = [] } = input

  if (stateData?.state?.slug === 'texas') {
    return calculatePropertyTaxTexas(input, stateData)
  }

  const countyRate = getCountyRate(stateData, county)
  const municipalRate = town ? getMunicipalRate(stateData, county, town) : null

  if (countyRate === null) {
    throw new Error(`Tax rates not found for ${county} County`)
  }

  // Calculate base tax
  const base = homeValue * countyRate

  // Calculate municipal adjustment
  const municipalAdjustment = town && municipalRate !== null ? homeValue * municipalRate : 0

  // Calculate subtotal
  const subtotal = base + municipalAdjustment

  // Calculate exemptions
  let totalExemptions = 0
  exemptions.forEach(exemptionId => {
    const exemption = exemptionId as keyof typeof njExemptions
    if (njExemptions[exemption]) {
      totalExemptions += njExemptions[exemption]
    }
  })

  // Calculate after exemptions
  const afterExemptions = subtotal - totalExemptions
  const annualTax = Math.max(afterExemptions, 0)
  const monthlyTax = annualTax / 12

  // Calculate effective rate
  const effectiveRate = homeValue > 0 ? (annualTax / homeValue) * 100 : 0

  // Calculate total rate
  const totalRate = countyRate + (municipalRate ?? 0)

  return {
    homeValue,
    countyRate: countyRate * 100, // Convert to percentage
    municipalRate: (municipalRate ?? 0) * 100, // Convert to percentage
    totalRate: totalRate * 100, // Convert to percentage
    annualTax,
    monthlyTax,
    effectiveRate,
    exemptions: totalExemptions,
    finalTax: annualTax,
    breakdown: {
      base,
      municipalAdjustment,
      subtotal,
      exemptions: totalExemptions,
      final: annualTax,
    },
    county,
  }
}

/**
 * Texas: Comptroller city/county unit rates must not be summed (unlike NJ county + municipal).
 * With a municipality selected, use city taxing unit rate only; otherwise county unit rate.
 */
function calculatePropertyTaxTexas(
  input: CalculateTaxInput,
  stateData: StateData
): TaxCalculationResult {
  const { homeValue, county, town } = input
  const townDec =
    town?.trim() ? getMunicipalRate(stateData, county, town.trim()) : null
  const countyDec = getCountyRate(stateData, county)

  let annualTax: number
  let countyRatePct: number
  let municipalRatePct: number
  let base: number
  let municipalAdjustment: number

  if (townDec != null) {
    municipalAdjustment = homeValue * townDec
    base = 0
    annualTax = municipalAdjustment
    countyRatePct = 0
    municipalRatePct = townDec * 100
  } else if (countyDec != null) {
    base = homeValue * countyDec
    municipalAdjustment = 0
    annualTax = base
    countyRatePct = countyDec * 100
    municipalRatePct = 0
  } else {
    throw new Error(
      `Tax rates not found for ${county}${town?.trim() ? ` / ${town}` : ''}. Run Texas metrics sourcing and merge.`
    )
  }

  const monthlyTax = annualTax / 12
  const effectiveRate = homeValue > 0 ? (annualTax / homeValue) * 100 : 0
  const totalRatePct = countyRatePct + municipalRatePct

  return {
    homeValue,
    countyRate: countyRatePct,
    municipalRate: municipalRatePct,
    totalRate: totalRatePct,
    annualTax,
    monthlyTax,
    effectiveRate,
    exemptions: 0,
    finalTax: annualTax,
    breakdown: {
      base,
      municipalAdjustment,
      subtotal: annualTax,
      exemptions: 0,
      final: annualTax,
    },
    county,
  }
}
