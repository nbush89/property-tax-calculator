/* eslint-disable no-console */
/**
 * Cross-reference Tier 1 towns: ensure they have town-level metrics and
 * overview values that differ from county (where expected).
 * Run after: merge-nj-tier1-metrics, merge-nj-avg-tax-bill, apply-town-overviews.
 */

import fs from 'node:fs'
import path from 'node:path'

const TIER1: Array<{ countySlug: string; townSlug: string; townName: string }> = [
  { countySlug: 'essex', townSlug: 'montclair', townName: 'Montclair' },
  { countySlug: 'hudson', townSlug: 'hoboken', townName: 'Hoboken' },
  { countySlug: 'mercer', townSlug: 'princeton', townName: 'Princeton' },
  { countySlug: 'bergen', townSlug: 'ridgewood', townName: 'Ridgewood' },
  { countySlug: 'bergen', townSlug: 'paramus', townName: 'Paramus' },
  { countySlug: 'union', townSlug: 'summit', townName: 'Summit' },
  { countySlug: 'union', townSlug: 'westfield', townName: 'Westfield' },
  { countySlug: 'morris', townSlug: 'morristown', townName: 'Morristown' },
  { countySlug: 'middlesex', townSlug: 'edison', townName: 'Edison' },
  { countySlug: 'camden', townSlug: 'cherry-hill', townName: 'Cherry Hill' },
  { countySlug: 'essex', townSlug: 'newark', townName: 'Newark' },
  { countySlug: 'hudson', townSlug: 'jersey-city', townName: 'Jersey City' },
  { countySlug: 'passaic', townSlug: 'paterson', townName: 'Paterson' },
  { countySlug: 'union', townSlug: 'elizabeth', townName: 'Elizabeth' },
  { countySlug: 'middlesex', townSlug: 'woodbridge', townName: 'Woodbridge' },
  { countySlug: 'ocean', townSlug: 'toms-river', townName: 'Toms River' },
  { countySlug: 'mercer', townSlug: 'hamilton', townName: 'Hamilton' },
  { countySlug: 'mercer', townSlug: 'trenton', townName: 'Trenton' },
  { countySlug: 'camden', townSlug: 'camden', townName: 'Camden' },
]

function main() {
  const statePath = path.join(process.cwd(), 'data', 'states', 'new-jersey.json')
  if (!fs.existsSync(statePath)) {
    console.error('Missing:', statePath)
    process.exit(1)
  }

  const state: { counties?: Array<{ slug: string; towns?: any[] }> } = JSON.parse(
    fs.readFileSync(statePath, 'utf8')
  )
  const countyBySlug = new Map(
    (state.counties ?? []).map((c: { slug: string; towns?: any[] }) => [String(c.slug), c])
  )

  let ok = 0
  const issues: string[] = []

  for (const t of TIER1) {
    const county = countyBySlug.get(t.countySlug)
    if (!county) {
      issues.push(`${t.townName} (${t.countySlug}): county not found`)
      continue
    }
    const town = (county.towns ?? []).find(
      (x: any) => String(x.slug) === t.townSlug || String(x.name) === t.townName
    )
    if (!town) {
      issues.push(`${t.townName} (${t.countySlug}): town not found in JSON`)
      continue
    }

    const ov = town.overview
    const hasTownBill = (town.metrics?.averageResidentialTaxBill?.length ?? 0) > 0
    const hasTownRate = (town.metrics?.effectiveTaxRate?.length ?? 0) > 0
    const billSame =
      ov &&
      ov.avgResidentialTaxBill != null &&
      ov.countyAvgTaxBill != null &&
      ov.avgResidentialTaxBill === ov.countyAvgTaxBill
    const rateSame =
      ov &&
      ov.effectiveTaxRatePct != null &&
      ov.countyEffectiveRatePct != null &&
      ov.effectiveTaxRatePct === ov.countyEffectiveRatePct

    if (!ov) {
      issues.push(`${t.townName}: no overview`)
      continue
    }
    if (!hasTownBill && billSame) {
      issues.push(
        `${t.townName}: no town-level averageResidentialTaxBill; overview shows county value (${ov.avgResidentialTaxBill}). Run source-nj-avg-tax-bill + merge-nj-avg-tax-bill.`
      )
    } else if (hasTownBill && billSame) {
      issues.push(
        `${t.townName}: has town metrics but avgResidentialTaxBill === countyAvgTaxBill (${ov.avgResidentialTaxBill}). Possible data coincidence or merge order.`
      )
    }
    if (!hasTownRate && rateSame) {
      issues.push(
        `${t.townName}: no town-level effectiveTaxRate; overview shows county value (${ov.effectiveTaxRatePct}%). Run source-nj-tier1-metrics + merge-nj-tier1-metrics.`
      )
    } else if (hasTownRate && rateSame) {
      issues.push(
        `${t.townName}: has town metrics but effectiveTaxRatePct === countyEffectiveRatePct (${ov.effectiveTaxRatePct}%). Possible data coincidence.`
      )
    }

    if ((hasTownBill || hasTownRate) && (!billSame || !rateSame || (hasTownBill && hasTownRate))) {
      ok++
    } else if (!issues.some(i => i.startsWith(`${t.townName}:`))) {
      ok++
    }
  }

  const reportOnly = process.argv.includes('--report')
  if (reportOnly) {
    console.log('Tier 1 towns – overview vs county:\n')
    for (const t of TIER1) {
      const county = countyBySlug.get(t.countySlug)
      const town = county?.towns?.find(
        (x: any) => String(x.slug) === t.townSlug || String(x.name) === t.townName
      )
      const ov = town?.overview
      const hasBill = (town?.metrics?.averageResidentialTaxBill?.length ?? 0) > 0
      const hasRate = (town?.metrics?.effectiveTaxRate?.length ?? 0) > 0
      const billDiff =
        ov && ov.avgResidentialTaxBill != null && ov.countyAvgTaxBill != null
          ? ov.avgResidentialTaxBill !== ov.countyAvgTaxBill
          : null
      const rateDiff =
        ov && ov.effectiveTaxRatePct != null && ov.countyEffectiveRatePct != null
          ? ov.effectiveTaxRatePct !== ov.countyEffectiveRatePct
          : null
      console.log(
        `  ${t.townName} (${t.countySlug}): bill ${hasBill ? '✓' : '✗'} ${billDiff === true ? 'diff' : billDiff === false ? 'SAME' : '—'}  rate ${hasRate ? '✓' : '✗'} ${rateDiff === true ? 'diff' : rateDiff === false ? 'SAME' : '—'}  (town ${ov?.avgResidentialTaxBill ?? '—'}/${ov?.effectiveTaxRatePct ?? '—'}  county ${ov?.countyAvgTaxBill ?? '—'}/${ov?.countyEffectiveRatePct ?? '—'})`
      )
    }
    console.log('\n✓ = has town-level metrics  diff = town ≠ county  SAME = town === county')
    return
  }

  if (issues.length > 0) {
    console.log('Tier 1 overview check – issues:\n')
    issues.forEach(i => console.log(' ', i))
    console.log('\nTotal Tier 1 towns:', TIER1.length)
    console.log('Issues:', issues.length)
    process.exit(1)
  }

  console.log(
    `All ${TIER1.length} Tier 1 towns have town-level data and/or differing overview values.`
  )
}

main()
