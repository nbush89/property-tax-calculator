import njMunicipalRates from '@/data/nj_municipal_rates.json'

export function getMunicipalRates(countyName: string, municipalityName: string): number | null {
  const county = countyName as keyof typeof njMunicipalRates
  const countyData = njMunicipalRates[county]
  
  if (!countyData) {
    return null
  }

  const municipality = municipalityName as keyof typeof countyData
  return countyData[municipality] ?? null
}

export function getMunicipalitiesByCounty(countyName: string): string[] {
  const county = countyName as keyof typeof njMunicipalRates
  const countyData = njMunicipalRates[county]
  
  if (!countyData) {
    return []
  }
  
  return Object.keys(countyData).sort()
}
