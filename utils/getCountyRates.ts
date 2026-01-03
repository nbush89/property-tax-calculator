import njCountyRates from '@/data/nj_county_rates.json'

export function getCountyRates(countyName: string): number | null {
  const county = countyName as keyof typeof njCountyRates
  return njCountyRates[county] ?? null
}

export function getAllCountyRates(): Record<string, number> {
  return njCountyRates as Record<string, number>
}

export function getAllCountyNames(): string[] {
  return Object.keys(njCountyRates).sort()
}
