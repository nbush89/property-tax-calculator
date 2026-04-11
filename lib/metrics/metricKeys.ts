/**
 * Shared metric identifier union — no runtime deps (safe for type-only imports everywhere).
 */

export type MetricKey =
  | 'effectiveTaxRate'
  | 'averageResidentialTaxBill'
  | 'medianHomeValue'
  | 'averageTaxRate'
  | 'medianTaxesPaid'
