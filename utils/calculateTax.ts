import { getCountyRates } from './getCountyRates'
import { getMunicipalRates } from './getMunicipalRates'
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

export function calculatePropertyTax(input: CalculateTaxInput): TaxCalculationResult {
  const { homeValue, county, town, exemptions = [] } = input

  // Get tax rates
  const countyRate = getCountyRates(county)
  const municipalRate = town ? getMunicipalRates(county, town) : 0

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
