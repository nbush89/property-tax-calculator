/**
 * State-level property tax relief / exemption domain model.
 * Programs are configured per state; calculator honors modelingMode honestly.
 */

export type ReliefProgramType =
  | 'exemption'
  | 'rebate'
  | 'freeze'
  | 'credit'
  | 'deferral'
  | 'abatement'

export type ReliefModelingMode = 'calculator_adjustable' | 'informational_only'

export type ReliefEligibilityInputType = 'boolean' | 'select' | 'number'

export type ReliefEligibilityInputOption = {
  value: string
  label: string
}

export type ReliefEligibilityInput = {
  key: string
  label: string
  description?: string
  inputType: ReliefEligibilityInputType
  options?: ReliefEligibilityInputOption[]
  defaultValue?: boolean | string | number
}

export type ReliefProgramEffect = {
  /** Reduces taxable value before rate is applied (e.g. homestead exemption dollars) */
  taxableValueReductionFlat?: number
  taxableValueReductionPercent?: number
  /** Reduces final estimated tax after rate × value */
  taxAmountReductionFlat?: number
  taxAmountReductionPercent?: number
  freezesSchoolTax?: boolean
  notes?: string[]
}

export type ReliefProgram = {
  id: string
  name: string
  shortName?: string
  type: ReliefProgramType
  modelingMode: ReliefModelingMode
  description: string
  appliesTo: 'primary_residence' | 'conditional' | 'all'
  eligibilitySummary?: string[]
  eligibilityInputs?: ReliefEligibilityInput[]
  effectDescription?: string
  calculatorEffect?: ReliefProgramEffect
  methodologyNote?: string
  learnMoreLabel?: string
  learnMoreUrl?: string
}

export type StateReliefConfig = {
  stateSlug: string
  stateName: string
  programs: ReliefProgram[]
  /** Shown on methodology / calculator disclaimer */
  globalDisclaimer?: string
}

/** Client/API: selected program id → checkbox or primitive input */
export type SelectedReliefInputs = Record<string, boolean | string | number>

export type AppliedReliefLine = {
  programId: string
  label: string
  summary: string
}

export type AppliedReliefResult = {
  adjustedTaxableValue: number
  /** Flat credits subtracted from tax (NJ-style), after rate applied to home/taxable value */
  taxCreditFlatTotal: number
  appliedPrograms: AppliedReliefLine[]
  informationalProgramsSelected: AppliedReliefLine[]
  methodologyNotes: string[]
}
