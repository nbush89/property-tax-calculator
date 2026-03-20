/**
 * Deterministic grouping of relief programs for page-tier presentation.
 * Single source: {@link StateReliefConfig}; no per-page forks of program data.
 */

import type { ReliefProgram, StateReliefConfig } from './types'

/** Types we treat as filing-, reimbursement-, or benefit-style on the state hub (deeper split). */
const FILING_OR_BENEFIT_TYPES = new Set<ReliefProgram['type']>(['rebate', 'freeze', 'credit'])

export type StateReliefPresentationGroups = {
  calculatorAdjustable: ReliefProgram[]
  /** Informational: rebates, freezes, filing-based credits (may affect bills or refunds) */
  informationalFilingOrBenefit: ReliefProgram[]
  /** Informational: exemptions, deferrals, abatements, and other exploration topics */
  informationalOther: ReliefProgram[]
}

export type CountyReliefPresentationGroups = {
  calculatorAdjustable: ReliefProgram[]
  informational: ReliefProgram[]
}

export function getStateReliefProgramGroups(
  config: StateReliefConfig | null
): StateReliefPresentationGroups | null {
  if (!config?.programs.length) return null

  const calculatorAdjustable = config.programs.filter(p => p.modelingMode === 'calculator_adjustable')
  const informational = config.programs.filter(p => p.modelingMode === 'informational_only')

  const informationalFilingOrBenefit = informational.filter(p => FILING_OR_BENEFIT_TYPES.has(p.type))
  const filingIds = new Set(informationalFilingOrBenefit.map(p => p.id))
  const informationalOther = informational.filter(p => !filingIds.has(p.id))

  return {
    calculatorAdjustable,
    informationalFilingOrBenefit,
    informationalOther,
  }
}

export function getCountyReliefProgramGroups(
  config: StateReliefConfig | null
): CountyReliefPresentationGroups | null {
  if (!config?.programs.length) return null
  return {
    calculatorAdjustable: config.programs.filter(p => p.modelingMode === 'calculator_adjustable'),
    informational: config.programs.filter(p => p.modelingMode === 'informational_only'),
  }
}

/**
 * Merge state presentation groups back to a deterministic full list (calculator first, then informational blocks).
 * Useful for tests and snapshots.
 */
export function flattenStateGroupsForTest(g: StateReliefPresentationGroups): ReliefProgram[] {
  return [
    ...g.calculatorAdjustable,
    ...g.informationalFilingOrBenefit,
    ...g.informationalOther,
  ]
}
