import type { ValidationIssueCode } from '@/lib/publishReadiness/types'

/** Surfaced prominently in admin detail (chips / ordering). */
export const HIGH_VISIBILITY_ISSUE_CODES: ValidationIssueCode[] = [
  'UNSUPPORTED_METRIC_RENDERED',
  'SNAPSHOT_MISSING',
  'PAGE_TOO_THIN',
  'TOO_FEW_SUBSTANTIVE_SECTIONS',
  'TOWN_LEVEL_PRECISION_UNSUPPORTED',
  'METHODOLOGY_MISSING',
  'FAQ_TOO_SHORT',
  'TREND_UNAVAILABLE',
  'FALLBACK_SNAPSHOT_USED',
  'FALLBACK_TREND_USED',
  'PRIMARY_METRIC_MISSING',
  'CALCULATOR_MISSING',
]

export function isHighVisibilityIssue(code: string): boolean {
  return HIGH_VISIBILITY_ISSUE_CODES.includes(code as ValidationIssueCode)
}
