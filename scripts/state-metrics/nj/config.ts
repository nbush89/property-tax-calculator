/** Single source of truth for NJ towns targeted by metrics sourcing + merge. */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

export type NjTownTarget = { countySlug: string; townSlug: string; townName: string }

type NjStateShape = {
  counties?: Array<{
    slug?: string
    towns?: Array<{ slug?: string; name?: string }>
  }>
}

function loadNjTownTargetsFromStateJson(): NjTownTarget[] {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const njPath = path.join(here, '../../../data/states/new-jersey.json')
  const raw = JSON.parse(fs.readFileSync(njPath, 'utf8')) as NjStateShape
  const out: NjTownTarget[] = []

  for (const county of raw.counties ?? []) {
    const countySlug = String(county.slug ?? '').trim()
    if (!countySlug) continue
    for (const town of county.towns ?? []) {
      const townSlug = String(town.slug ?? '').trim()
      const townName = String(town.name ?? '').trim()
      if (!townSlug || !townName) continue
      out.push({ countySlug, townSlug, townName })
    }
  }
  return out
}

export const NJ_TIER1: NjTownTarget[] = loadNjTownTargetsFromStateJson()

export const PDF_DISTRICT_OVERRIDES: Record<string, string> = {
  Montclair: 'MONTCLAIR TWP',
  Hoboken: 'HOBOKEN CITY',
  Princeton: 'PRINCETON',
  Ridgewood: 'RIDGEWOOD VILLAGE',
  Paramus: 'PARAMUS BORO',
  Summit: 'SUMMIT CITY',
  Westfield: 'WESTFIELD TOWN',
  Morristown: 'MORRISTOWN TOWN',
  Edison: 'EDISON TWP',
  'Cherry Hill': 'CHERRY HILL TWNSHP',
  Newark: 'NEWARK CITY',
  'Jersey City': 'JERSEY CITY',
  Paterson: 'PATERSON CITY',
  Elizabeth: 'ELIZABETH CITY',
  Woodbridge: 'WOODBRIDGE TWP',
  'Toms River': 'TOMS RIVER TWP',
  Hamilton: 'HAMILTON TWP',
  Trenton: 'TRENTON CITY',
  Camden: 'CAMDEN CITY',
  'Lakewood Township': 'LAKEWOOD TWP',
  'Middletown Township': 'MIDDLETOWN TWP',
  'Old Bridge Township': 'OLD BRIDGE TWP',
  'East Brunswick': 'EAST BRUNSWICK TWP',
  'Mount Laurel': 'MT LAUREL TWP',
  Parsippany: 'PARSIPPANY TR HLS TWP',
  'Franklin Township': 'FRANKLIN TWP',
  'Bridgewater Township': 'BRIDGEWATER TWP',
  'Wayne Township': 'WAYNE TWP',
  'East Orange': 'EAST ORANGE CITY',
  Bayonne: 'BAYONNE CITY',
  Piscataway: 'PISCATAWAY TWP',
  // Bergen County expansion
  'Fair Lawn': 'FAIR LAWN BORO',
  Garfield: 'GARFIELD CITY',
  Englewood: 'ENGLEWOOD CITY',
  Bergenfield: 'BERGENFIELD BORO',
  Mahwah: 'MAHWAH TWP',
  'Cliffside Park': 'CLIFFSIDE PARK BORO',
  Lodi: 'LODI BORO',
  Lyndhurst: 'LYNDHURST TWP',
  Wyckoff: 'WYCKOFF TWP',
  Rutherford: 'RUTHERFORD BORO',
  Dumont: 'DUMONT BORO',
  'New Milford': 'NEW MILFORD BORO',
  Ramsey: 'RAMSEY BORO',
  'Saddle Brook': 'SADDLE BROOK TWP',
  'Glen Rock': 'GLEN ROCK BORO',
}

export const NJ_TAXRATE_PDF_URL_TEMPLATE =
  'https://www.nj.gov/treasury/taxation/pdf/lpt/gtr/{year}taxrates.pdf'
export const NJ_GTR_SOURCE_REF = 'nj_div_taxation_general_effective_tax_rates'
