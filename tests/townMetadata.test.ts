/**
 * Town SEO tier + title/description generation
 */
import assert from 'node:assert/strict'
import type { CountyData, DataPoint, StateData, TownData } from '@/lib/data/types'
import { getTownBySlugs, getStateData } from '@/lib/geo'
import { resolveTownPageOverview } from '@/lib/town-overview/resolve-page-overview'
import {
  buildTownSeoFields,
  formatCountySeoPhrase,
  generateTownSeoDescription,
  generateTownSeoTitle,
  resolveTownSeoTier,
  resolveTownSeoYear,
} from '@/lib/seo/townMetadata'

const dp = (
  year: number,
  value: number,
  unit: DataPoint['unit'] = 'PERCENT',
  sourceRef = 't'
): DataPoint => ({ year, value, unit, sourceRef })

const minimalState = (y = 2024): StateData =>
  ({
    state: {
      name: 'New Jersey',
      slug: 'new-jersey',
      abbreviation: 'NJ',
      asOfYear: y,
    },
    sources: {},
    counties: [],
  }) as StateData

const bergenCounty = (y = 2024): CountyData =>
  ({
    name: 'Bergen',
    slug: 'bergen',
    asOfYear: y,
    towns: [],
  }) as CountyData

function run(): void {
  const county = bergenCounty(2024)
  const stateData = minimalState(2024)

  const strongTown: TownData = {
    name: 'Strongville',
    slug: 'strongville',
    metrics: {
      effectiveTaxRate: [dp(2021, 2), dp(2022, 2.1), dp(2023, 2.2)],
      averageResidentialTaxBill: [dp(2021, 9000, 'USD'), dp(2022, 9100, 'USD'), dp(2023, 9200, 'USD')],
    },
  }
  assert.equal(resolveTownSeoTier(strongTown), 'strong')
  const strongTitle = generateTownSeoTitle({
    tier: 'strong',
    townDisplayName: 'Strongville',
    stateAbbrev: 'NJ',
    year: 2023,
    county,
  })
  assert.match(strongTitle, /Strongville, NJ Property Tax Calculator \(2023\) \+ Rates/)
  const strongDesc = generateTownSeoDescription({
    tier: 'strong',
    townDisplayName: 'Strongville',
    stateName: 'New Jersey',
    county,
  })
  assert.match(strongDesc, /average tax bills/)

  const mediumTown: TownData = {
    name: 'Mediumtown',
    slug: 'mediumtown',
    metrics: {
      effectiveTaxRate: [dp(2021, 1.5), dp(2022, 1.6), dp(2023, 1.7)],
    },
  }
  assert.equal(resolveTownSeoTier(mediumTown), 'medium')
  const medDesc = generateTownSeoDescription({
    tier: 'medium',
    townDisplayName: 'Mediumtown',
    stateName: 'Texas',
    county,
  })
  assert.equal(medDesc.includes('average tax bill'), false)

  const sparseTown: TownData = {
    name: 'Sparseville',
    slug: 'sparseville',
    metrics: {},
  }
  assert.equal(resolveTownSeoTier(sparseTown), 'sparse')
  const sparseTitle = generateTownSeoTitle({
    tier: 'sparse',
    townDisplayName: 'Sparseville',
    stateAbbrev: 'NJ',
    year: 2022,
    county,
  })
  assert.match(sparseTitle, /Sparseville, NJ Property Tax Estimate \(2022\) \| Bergen County/)

  assert.equal(formatCountySeoPhrase({ name: 'Bergen', slug: 'bergen', towns: [] }), 'Bergen County')

  const overview = resolveTownPageOverview(strongTown, county, stateData)
  const fields = buildTownSeoFields({
    town: strongTown,
    county,
    stateData,
    overview,
  })
  assert.equal(fields.tier, 'strong')
  assert.ok(fields.title.length > 20)
  assert.ok(fields.description.length > 40)

  const y = resolveTownSeoYear({
    town: { ...strongTown, asOfYear: undefined },
    county,
    stateData,
    overview: null,
    effectiveRateYear: 2022,
  })
  assert.equal(y, 2022)

  const houston = getTownBySlugs('texas', 'harris-county-property-tax', 'houston-property-tax')
  assert.ok(houston)
  const txState = getStateData('texas')!
  const hOverview = resolveTownPageOverview(houston!.town, houston!.county, txState)
  const hFields = buildTownSeoFields({
    town: houston!.town,
    county: houston!.county,
    stateData: txState,
    overview: hOverview,
  })
  assert.equal(hFields.tier, 'medium')
  assert.equal(hFields.description.includes('average tax bills'), false)
  assert.match(hFields.title, /Houston, TX Property Tax Calculator/)

  console.log('[OK] townMetadata tests passed')
}

run()
