/**
 * Centralized FAQ copy tied to relief config (avoid duplicating TX/NJ strings).
 */

import { getCalculatorAdjustablePrograms, getInformationalPrograms } from './stateReliefConfigs'

export function getReliefFaqDoesCalculatorIncludeExemptions(stateSlug: string): string {
  const adj = getCalculatorAdjustablePrograms(stateSlug)
  const info = getInformationalPrograms(stateSlug)
  const adjNames = adj.map(p => p.shortName ?? p.name).join(', ')
  const hasAdj = adj.length > 0
  const hasInfo = info.length > 0

  if (stateSlug === 'texas') {
    return [
      hasAdj
        ? `You can optionally apply a simplified residence homestead exemption to taxable value before the rate is applied (${adjNames || 'homestead'}).`
        : '',
      'Additional programs (over-65 school limits, disabled veteran exemptions, local optional amounts) are not modeled automatically.',
      hasInfo ? 'See the relief section on this page for programs that need local verification.' : '',
      'Always confirm exemptions with your county appraisal district.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (stateSlug === 'new-jersey') {
    return [
      hasAdj
        ? `The calculator can apply illustrative flat credits for some deduction scenarios (${adjNames}) — these are planning aids only.`
        : '',
      hasInfo
        ? `Major programs such as ${info
            .slice(0, 2)
            .map(p => p.shortName ?? p.name)
            .join(' and ')} are reimbursement- or filing-based and are not subtracted automatically in the estimate.`
        : '',
      'Confirm eligibility and amounts with your municipal tax collector and the NJ Division of Taxation.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (stateSlug === 'georgia') {
    return [
      'The calculator applies the statewide $2,000 standard homestead exemption to assessed value for primary residences (toggle the primary-residence flag to compare).',
      'Many GA counties stack additional local exemptions (senior age-65, disability, floating homestead) that are not modeled automatically — those typically reduce the bill further.',
      'HB 581 statewide floating homestead exemption took effect Jan 1, 2025, but Fulton, DeKalb, Gwinnett, and Cobb (and their school districts) all opted out, so the traditional calculation applies in those counties — see our HB 581 opt-out breakdown for the full county-by-county detail.',
      'Confirm eligibility and amounts with your county tax commissioner.',
    ].join(' ')
  }

  return 'Exemption modeling varies by state. Use the methodology page and official sources for eligibility.'
}
