#!/usr/bin/env node
/**
 * Validation script for state data files
 * Checks basic invariants: series length <= 5, sorted years, latest year matches asOfYear
 */

import fs from 'node:fs'
import path from 'node:path'
import { normalizeStateData } from '../lib/data/adapter'
import { assertSorted, assertMaxLength, getLatestYear } from '../lib/data/metrics'
import type { StateData } from '../lib/data/types'

const STATES_DIR = path.join(process.cwd(), 'data', 'states')

function validateStateData(filePath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const stateData = normalizeStateData(rawData as any) as StateData

    // Check asOfYear matches latest year in metrics
    if (stateData.state.asOfYear) {
      const stateLatestYear = getLatestYear(stateData.metrics?.averageTaxRate)
      if (stateLatestYear && stateLatestYear !== stateData.state.asOfYear) {
        errors.push(
          `State asOfYear (${stateData.state.asOfYear}) doesn't match latest metric year (${stateLatestYear})`
        )
      }
    }

    // Validate each county
    for (const county of stateData.counties) {
      const countyName = county.name

      // Check county asOfYear matches latest year
      if (county.asOfYear) {
        const taxBillYear = getLatestYear(county.metrics?.averageResidentialTaxBill)
        const rateYear = getLatestYear(county.metrics?.effectiveTaxRate)
        const latestYear = taxBillYear || rateYear

        if (latestYear && latestYear !== county.asOfYear) {
          errors.push(
            `${countyName} County: asOfYear (${county.asOfYear}) doesn't match latest metric year (${latestYear})`
          )
        }
      }

      // Validate tax bill series
      if (county.metrics?.averageResidentialTaxBill) {
        try {
          assertMaxLength(county.metrics.averageResidentialTaxBill, `${countyName} tax bill series`)
          assertSorted(county.metrics.averageResidentialTaxBill, `${countyName} tax bill series`)
        } catch (err) {
          errors.push(`${countyName} County: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      // Validate rate series
      if (county.metrics?.effectiveTaxRate) {
        try {
          assertMaxLength(county.metrics.effectiveTaxRate, `${countyName} rate series`)
          assertSorted(county.metrics.effectiveTaxRate, `${countyName} rate series`)
        } catch (err) {
          errors.push(`${countyName} County: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      // Validate town metrics if present
      if (county.towns) {
        for (const town of county.towns) {
          // Validate effectiveTaxRate if present (town metrics use TownDataPoint[], not MetricSeries)
          if (town.metrics?.effectiveTaxRate) {
            const series = town.metrics.effectiveTaxRate
            if (series.length > 5) {
              errors.push(
                `${countyName} - ${town.name}: effectiveTaxRate has ${series.length} items, but maximum allowed is 5`
              )
            }
            // Check sorting manually for TownDataPoint[]
            for (let i = 1; i < series.length; i++) {
              if (series[i].year < series[i - 1].year) {
                errors.push(
                  `${countyName} - ${town.name}: effectiveTaxRate is not sorted by year ascending. Found year ${series[i].year} after ${series[i - 1].year}`
                )
                break
              }
            }
          }
          // Validate averageResidentialTaxBill if present
          if (town.metrics?.averageResidentialTaxBill) {
            const series = town.metrics.averageResidentialTaxBill
            if (series.length > 5) {
              errors.push(
                `${countyName} - ${town.name}: averageResidentialTaxBill has ${series.length} items, but maximum allowed is 5`
              )
            }
            // Check sorting manually for TownDataPoint[]
            for (let i = 1; i < series.length; i++) {
              if (series[i].year < series[i - 1].year) {
                errors.push(
                  `${countyName} - ${town.name}: averageResidentialTaxBill is not sorted by year ascending. Found year ${series[i].year} after ${series[i - 1].year}`
                )
                break
              }
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  } catch (err) {
    return {
      valid: false,
      errors: [
        `Failed to parse or validate ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
      ],
    }
  }
}

// Main execution
function main() {
  const files = fs.readdirSync(STATES_DIR).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    console.log('No state data files found in', STATES_DIR)
    process.exit(0)
  }

  console.log(`Validating ${files.length} state data file(s)...\n`)

  let totalErrors = 0

  for (const file of files) {
    const filePath = path.join(STATES_DIR, file)
    console.log(`Checking ${file}...`)

    const result = validateStateData(filePath)

    if (result.valid) {
      console.log(`  ✓ ${file} is valid\n`)
    } else {
      console.error(`  ✗ ${file} has errors:`)
      for (const error of result.errors) {
        console.error(`    - ${error}`)
      }
      console.error()
      totalErrors += result.errors.length
    }
  }

  if (totalErrors === 0) {
    console.log('✓ All state data files are valid!')
    process.exit(0)
  } else {
    console.error(`✗ Found ${totalErrors} error(s) across ${files.length} file(s)`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
