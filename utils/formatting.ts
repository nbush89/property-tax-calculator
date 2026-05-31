/**
 * Format a USD amount for display. Defaults to whole dollars (no cents),
 * matching how public property tax estimators and consumer sites typically
 * display annual / monthly tax. Mills only carry ~3 decimal places of
 * precision, so sub-dollar precision in the displayed bill is misleading.
 *
 * Pass `withCents: true` for callers that genuinely need 2 decimal places
 * (e.g. line-item breakdowns or accounting-style displays).
 */
export function formatCurrency(amount: number, opts?: { withCents?: boolean }): string {
  const decimals = opts?.withCents ? 2 : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatPercentage(num: number, decimals: number = 3): string {
  return `${formatNumber(num, decimals)}%`
}

