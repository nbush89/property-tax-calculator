/**
 * Tier-specific intro and methodology strings derived from config metadata only (no state slug switches).
 */

export function buildStateReliefIntro(stateName: string): { lead: string; secondary: string } {
  return {
    lead: `Property tax exemptions, credits, and relief programs in ${stateName} are defined mainly at the state level. Local taxing districts and assessors apply the rules, optional amounts can vary by jurisdiction, and many benefits depend on filing, income, age, or disability status.`,
    secondary: `Below we group programs by how this site handles them: a few may be applied as simplified planning adjustments in the calculator; others can change what you pay or receive in real life but are not fully modeled here. Always confirm eligibility with official tax authorities.`,
  }
}

export function buildCountyReliefIntro(stateName: string, countyName: string): string {
  return `Relief programs are state-defined in ${stateName} but apply to homeowners in ${countyName} County. The county appraisal district or tax office administers many filings. Use the overview below for a practical county-context summary, and see the state page for the full statewide picture.`
}

export function buildTownReliefIntro(stateName: string, townName: string): string {
  return `Programs below are state-defined; they may affect taxes in ${townName} differently than this planning estimate. Use “Exemptions and tax relief” in the calculator when you want to try simplified adjustments we support.`
}

export function buildEstimateContextNote(
  stateName: string,
  hasCalculatorAdjustable: boolean
): string {
  if (hasCalculatorAdjustable) {
    return `The calculator above can include simplified ${stateName} relief where marked “Included in estimate.” Other programs may lower your actual bill or provide refunds but are not subtracted automatically in this tool.`
  }
  return `This estimate uses published rates and your entered value. Major ${stateName} relief programs are filing- or reimbursement-based and are not built into the number shown; see highlights below and your county page for context.`
}

export function buildReliefMethodologySummary(stateName: string, tier: 'state' | 'county' | 'town'): string {
  if (tier === 'state') {
    return `Actual savings depend on eligibility, assessments, local taxing units, caps, freezes, reimbursement timing, and ${stateName} administration. This page explains common programs; it is not tax preparation advice.`
  }
  if (tier === 'county') {
    return `Savings depend on eligibility and local administration in ${stateName}. Calculator adjustments are illustrative only—verify with your county and state tax agencies.`
  }
  return `Eligibility and amounts vary by property and locality in ${stateName}.`
}
