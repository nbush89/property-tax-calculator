/**
 * Texas relief programs — homestead modeled conservatively; age/disability programs informational.
 */

import type { StateReliefConfig } from '../types'

/**
 * Simplified statewide residence homestead amount applied to **taxable value** before rate.
 * Texas raised the general residence homestead school-district M&O exemption from $40K
 * to $100K via Prop 4 (Nov 2023), then to $140K effective 2025. Senior (65+) homeowners
 * receive an additional $60,000 ($200K total) plus a school tax ceiling that freezes
 * their school taxes at the qualifying year's amount.
 *
 * Note: this constant captures the general homestead only — the calculator does not
 * yet model the senior/disabled additional exemption, school tax ceiling, or the 10%
 * appraisal cap. See lib/relief/states/texasRelief.ts programs list + the
 * /texas/property-tax-exemptions page for the editorial overview.
 *
 * Source: Texas Tax Code §11.13(b); confirmed via Texas Comptroller exemptions page.
 */
export const TEXAS_GENERAL_RESIDENCE_HOMESTEAD_EXEMPTION_AMOUNT = 140_000

export const texasReliefConfig: StateReliefConfig = {
  stateSlug: 'texas',
  stateName: 'Texas',
  globalDisclaimer:
    'Texas bills combine many taxing units. We apply one Comptroller-published total rate to an estimate of taxable value. Optional local exemptions, caps, and eligibility rules can change your actual bill.',
  programs: [
    {
      id: 'tx_homestead_residence',
      name: 'Residence homestead exemption (simplified)',
      shortName: 'Homestead (estimate)',
      type: 'exemption',
      modelingMode: 'calculator_adjustable',
      description:
        'Reduces estimated taxable value by a statewide general homestead amount before applying the selected total tax rate. Does not include optional local exemptions or district-by-district splits.',
      appliesTo: 'primary_residence',
      eligibilitySummary: [
        'Generally requires filing for homestead with your appraisal district',
        'Must be your principal residence',
      ],
      effectDescription: `Reduces taxable value by $${TEXAS_GENERAL_RESIDENCE_HOMESTEAD_EXEMPTION_AMOUNT.toLocaleString()} in this estimate (simplified).`,
      calculatorEffect: {
        taxableValueReductionFlat: TEXAS_GENERAL_RESIDENCE_HOMESTEAD_EXEMPTION_AMOUNT,
        notes: [
          'Actual exemption amounts and what they apply to vary by taxing unit and election outcomes.',
          'This tool uses one combined rate from published data; it cannot recreate every district’s freeze or ceiling.',
        ],
      },
      methodologyNote:
        'Estimate only: taxable value cannot go below zero. Confirm exemption and eligibility with your county appraisal district.',
      learnMoreLabel: 'Texas Comptroller — property tax',
      learnMoreUrl: 'https://comptroller.texas.gov/taxes/property-tax/',
    },
    {
      id: 'tx_over_65_school_freeze',
      name: 'Over-65 / disabled school tax limitations',
      shortName: 'Over 65 / school tax limits',
      type: 'freeze',
      modelingMode: 'informational_only',
      description:
        'Texas offers additional benefits for qualifying homeowners (including school district tax transfers and limitations). Outcomes depend on your taxing units, prior years, and application — not suitable for a single universal adjustment here.',
      appliesTo: 'conditional',
      eligibilitySummary: ['Age or disability requirements', 'Must apply and qualify with local appraisal district'],
      effectDescription: 'Not included in the numeric estimate.',
      methodologyNote:
        'School tax freezes and transfers are taxpayer- and district-specific. Use official CAD tools or a tax professional for figures.',
      learnMoreLabel: 'Texas Comptroller — exemptions',
      learnMoreUrl: 'https://comptroller.texas.gov/taxes/property-tax/exemptions/',
    },
    {
      id: 'tx_disabled_veteran_exemption',
      name: 'Disabled veteran and related exemptions',
      shortName: 'Disabled veteran',
      type: 'exemption',
      modelingMode: 'informational_only',
      description:
        'Disability rating tiers and exemption amounts vary widely. We do not approximate veteran exemptions in the calculator.',
      appliesTo: 'conditional',
      eligibilitySummary: ['Requires qualifying disability rating or surviving spouse rules as applicable'],
      effectDescription: 'Not included in the numeric estimate.',
      learnMoreLabel: 'Texas Veterans Commission — property tax',
      learnMoreUrl: 'https://www.tvc.texas.gov/',
    },
  ],
}
