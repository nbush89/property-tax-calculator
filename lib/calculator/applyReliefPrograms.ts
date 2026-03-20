/**
 * Applies selected relief programs to taxable value and/or tax credits (deterministic, config-driven).
 */

import type { AppliedReliefLine, AppliedReliefResult, SelectedReliefInputs } from '@/lib/relief/types'
import { getCalculatorAdjustablePrograms, getStateReliefConfig } from '@/lib/relief/stateReliefConfigs'

function isSelected(selections: SelectedReliefInputs | undefined, programId: string): boolean {
  if (!selections) return false
  return selections[programId] === true
}

/**
 * Texas: reduce taxable value by flat homestead (and any future configurable adjustments).
 * NJ credits are returned as taxCreditFlatTotal (applied after rate × value in calculatePropertyTax).
 */
export function computeReliefAdjustments(
  stateSlug: string,
  homeValue: number,
  selections: SelectedReliefInputs | undefined
): AppliedReliefResult {
  const methodologyNotes: string[] = []
  const appliedPrograms: AppliedReliefLine[] = []
  const informationalProgramsSelected: AppliedReliefLine[] = []

  let adjustedTaxableValue = Math.max(0, homeValue)
  let taxCreditFlatTotal = 0

  const config = getStateReliefConfig(stateSlug)

  if (!selections || Object.keys(selections).length === 0) {
    return {
      adjustedTaxableValue,
      taxCreditFlatTotal,
      appliedPrograms,
      informationalProgramsSelected,
      methodologyNotes,
    }
  }

  const adjustable = getCalculatorAdjustablePrograms(stateSlug)

  if (stateSlug === 'texas') {
    for (const p of adjustable) {
      if (!isSelected(selections, p.id)) continue
      const flat = p.calculatorEffect?.taxableValueReductionFlat
      if (flat != null && flat > 0) {
        adjustedTaxableValue = Math.max(0, adjustedTaxableValue - flat)
        appliedPrograms.push({
          programId: p.id,
          label: p.shortName ?? p.name,
          summary: p.effectDescription ?? `Reduced taxable value by $${flat.toLocaleString()} (estimate).`,
        })
        if (p.methodologyNote) methodologyNotes.push(p.methodologyNote)
        const extra = p.calculatorEffect?.notes
        if (extra?.length) methodologyNotes.push(...extra)
      }
    }
  }

  if (stateSlug === 'new-jersey') {
    for (const p of adjustable) {
      if (!isSelected(selections, p.id)) continue
      const credit = p.calculatorEffect?.taxAmountReductionFlat
      if (credit != null && credit > 0) {
        taxCreditFlatTotal += credit
        appliedPrograms.push({
          programId: p.id,
          label: p.shortName ?? p.name,
          summary: `Illustrative credit: −$${credit.toLocaleString()} from estimated tax.`,
        })
        if (p.methodologyNote) methodologyNotes.push(p.methodologyNote)
      }
    }
  }

  if (
    config?.globalDisclaimer &&
    (appliedPrograms.length > 0 || taxCreditFlatTotal > 0 || adjustedTaxableValue < homeValue)
  ) {
    methodologyNotes.unshift(config.globalDisclaimer)
  }

  return {
    adjustedTaxableValue,
    taxCreditFlatTotal,
    appliedPrograms,
    informationalProgramsSelected,
    methodologyNotes,
  }
}

/** Dedupe methodology notes */
export function uniqueNotes(notes: string[]): string[] {
  return [...new Set(notes.filter(Boolean))]
}
