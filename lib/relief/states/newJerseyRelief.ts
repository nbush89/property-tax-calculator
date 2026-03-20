/**
 * New Jersey relief — major rebate/freeze programs are informational; small illustrative credits optional in calculator.
 */

import type { StateReliefConfig } from '../types'

export const newJerseyReliefConfig: StateReliefConfig = {
  stateSlug: 'new-jersey',
  stateName: 'New Jersey',
  globalDisclaimer:
    'New Jersey runs several reimbursement, rebate, and freeze programs that depend on income, age, filings, and payment timing. This calculator uses simplified rate math; large programs like ANCHOR and Senior Freeze are explained below but not modeled as automatic tax reductions.',
  programs: [
    {
      id: 'nj_anchor',
      name: 'ANCHOR benefit',
      shortName: 'ANCHOR',
      type: 'rebate',
      modelingMode: 'informational_only',
      description:
        'ANCHOR provides benefits to eligible homeowners and renters based on income and filing requirements. It is reimbursement-style, not a simple subtraction from the tax rate calculation shown here.',
      appliesTo: 'conditional',
      eligibilitySummary: ['Income and residency requirements', 'Annual filing with the Division of Taxation'],
      effectDescription: 'Not included in this site’s numeric tax estimate.',
      learnMoreLabel: 'NJ Division of Taxation — ANCHOR',
      learnMoreUrl: 'https://www.nj.gov/treasury/taxation/anchor/',
    },
    {
      id: 'nj_senior_freeze',
      name: 'Senior Freeze (Property Tax Reimbursement)',
      shortName: 'Senior Freeze',
      type: 'freeze',
      modelingMode: 'informational_only',
      description:
        'Senior Freeze reimburses eligible seniors and surviving spouses for property tax increases when requirements are met. Amounts depend on prior-year taxes and eligibility — not a flat deduction from the estimate below.',
      appliesTo: 'conditional',
      eligibilitySummary: ['Age and income limits', 'Timely application and payment of property taxes'],
      effectDescription: 'Not included in this site’s numeric tax estimate.',
      learnMoreLabel: 'NJ PTR / Senior Freeze',
      learnMoreUrl: 'https://www.nj.gov/treasury/taxation/ptsr/',
    },
    {
      id: 'nj_homestead_benefit',
      name: 'Homestead Benefit (historical / filing-based)',
      shortName: 'Homestead Benefit',
      type: 'credit',
      modelingMode: 'informational_only',
      description:
        'Homestead-related benefits in New Jersey are filing- and eligibility-based. This tool does not model homestead benefit credits automatically.',
      appliesTo: 'conditional',
      effectDescription: 'Not included in the numeric estimate.',
      learnMoreLabel: 'NJ Division of Taxation',
      learnMoreUrl: 'https://www.nj.gov/treasury/taxation/',
    },
    {
      id: 'nj_credit_veteran',
      name: 'Veteran / disabled deduction (illustrative flat credit in estimate)',
      shortName: 'Veteran deduction (estimate)',
      type: 'credit',
      modelingMode: 'calculator_adjustable',
      description:
        'Illustrative planning credit subtracted from the estimated tax after rates are applied. Real veteran and disabled deductions have specific eligibility rules and may differ.',
      appliesTo: 'conditional',
      eligibilitySummary: ['Confirm eligibility with your municipal tax collector'],
      calculatorEffect: {
        taxAmountReductionFlat: 6000,
      },
      methodologyNote:
        'Flat amount is illustrative for comparison only, not a guarantee of your benefit.',
    },
    {
      id: 'nj_credit_disabled',
      name: 'Disabled person deduction (illustrative flat credit in estimate)',
      shortName: 'Disabled deduction (estimate)',
      type: 'credit',
      modelingMode: 'calculator_adjustable',
      description:
        'Illustrative flat credit for planning. Actual disabled person deductions depend on program rules and local administration.',
      appliesTo: 'conditional',
      eligibilitySummary: ['Confirm eligibility with your municipal tax collector'],
      calculatorEffect: {
        taxAmountReductionFlat: 3500,
      },
      methodologyNote: 'Illustrative only.',
    },
  ],
}
