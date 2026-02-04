export function buildRecentYears({
  endYear,
  window,
}: {
  endYear: number
  window: number
}): number[] {
  return Array.from({ length: window }, (_, i) => endYear - i).reverse()
}
