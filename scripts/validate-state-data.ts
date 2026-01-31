#!/usr/bin/env tsx
/**
 * Validation script for state data JSON files.
 * Checks structure, data integrity, and constraints.
 *
 * Sources: Accepts two shapes—canonical (publisher, title, type, homepageUrl)
 * or alternate from merge scripts (name, url). Town slug and asOfYear are
 * optional; missing values produce warnings (add slugs for routing; asOfYear
 * is set when metrics are merged).
 */

import fs from 'node:fs'
import path from 'node:path'
import type { StateData, DataPoint, Source } from '../lib/data/types'

const VALID_UNITS = ['USD', 'PERCENT'] as const
const MAX_SERIES_LENGTH = 5
const MIN_YEAR = 2000
const MAX_YEAR = new Date().getFullYear() + 1

interface ValidationError {
  path: string
  message: string
}

const errors: ValidationError[] = []
const warnings: ValidationError[] = []

function addError(path: string, message: string) {
  errors.push({ path, message })
}

function addWarning(path: string, message: string) {
  warnings.push({ path, message })
}

/**
 * Validate a DataPoint
 */
function validateDataPoint(
  datapoint: any,
  pathPrefix: string,
  sources: Record<string, Source>
): boolean {
  let valid = true

  // Check required fields
  if (typeof datapoint.year !== 'number') {
    addError(pathPrefix, 'year must be a number')
    valid = false
  } else {
    if (datapoint.year < MIN_YEAR || datapoint.year > MAX_YEAR) {
      addError(
        pathPrefix,
        `year must be between ${MIN_YEAR} and ${MAX_YEAR}, got ${datapoint.year}`
      )
      valid = false
    }
  }

  if (typeof datapoint.value !== 'number') {
    addError(pathPrefix, 'value must be a number')
    valid = false
  }

  if (!VALID_UNITS.includes(datapoint.unit)) {
    addError(pathPrefix, `unit must be one of ${VALID_UNITS.join(', ')}, got ${datapoint.unit}`)
    valid = false
  }

  if (typeof datapoint.sourceRef !== 'string') {
    addError(pathPrefix, 'sourceRef must be a string')
    valid = false
  } else {
    // Check that sourceRef exists in sources map
    if (!sources[datapoint.sourceRef]) {
      addError(pathPrefix, `sourceRef "${datapoint.sourceRef}" not found in sources map`)
      valid = false
    }
  }

  return valid
}

/**
 * Validate a metric series
 */
function validateSeries(series: any[], pathPrefix: string, sources: Record<string, Source>): void {
  if (!Array.isArray(series)) {
    addError(pathPrefix, 'must be an array')
    return
  }

  if (series.length > MAX_SERIES_LENGTH) {
    addError(
      pathPrefix,
      `series has ${series.length} items, maximum allowed is ${MAX_SERIES_LENGTH}`
    )
  }

  // Validate each datapoint
  series.forEach((dp, index) => {
    validateDataPoint(dp, `${pathPrefix}[${index}]`, sources)
  })

  // Check sorting (warning only)
  if (series.length >= 2) {
    for (let i = 1; i < series.length; i++) {
      if (series[i].year < series[i - 1].year) {
        addWarning(
          pathPrefix,
          `series is not sorted by year ascending: found year ${series[i].year} after ${series[i - 1].year}`
        )
        break
      }
    }
  }
}

/**
 * Validate a Source object.
 * Accepts two shapes: canonical (publisher, title, type, homepageUrl) or
 * alternate from merge scripts (name, reference, url).
 */
function validateSource(source: any, sourceKey: string): void {
  const pathPrefix = `sources["${sourceKey}"]`
  const hasCanonical =
    typeof source.publisher === 'string' &&
    source.publisher &&
    typeof source.title === 'string' &&
    source.title &&
    typeof source.type === 'string' &&
    source.type &&
    typeof source.homepageUrl === 'string' &&
    source.homepageUrl
  const hasAlternate =
    typeof source.name === 'string' && source.name && typeof source.url === 'string' && source.url

  if (!hasCanonical && !hasAlternate) {
    addError(
      pathPrefix,
      'source must have either (publisher, title, type, homepageUrl) or (name, url)'
    )
  }

  // Validate yearUrls if present (canonical shape)
  if (source.yearUrls !== undefined) {
    if (typeof source.yearUrls !== 'object' || Array.isArray(source.yearUrls)) {
      addError(pathPrefix, 'yearUrls must be an object')
    } else {
      for (const [yearStr, url] of Object.entries(source.yearUrls)) {
        const year = parseInt(yearStr, 10)
        if (isNaN(year)) {
          addError(`${pathPrefix}.yearUrls["${yearStr}"]`, 'year key must be a numeric string')
        }
        if (typeof url !== 'string') {
          addError(`${pathPrefix}.yearUrls["${yearStr}"]`, 'URL value must be a string')
        }
      }
    }
  }
}

/**
 * Validate state data structure
 */
function validateStateData(data: any): void {
  // Check top-level structure
  if (!data.state) {
    addError('root', 'missing required "state" object')
    return
  }

  if (!data.sources) {
    addError('root', 'missing required "sources" object')
    return
  }

  if (!Array.isArray(data.counties)) {
    addError('root', 'missing required "counties" array')
    return
  }

  // Validate state metadata
  const state = data.state
  if (typeof state.name !== 'string' || !state.name) {
    addError('state.name', 'must be a non-empty string')
  }
  if (typeof state.slug !== 'string' || !state.slug) {
    addError('state.slug', 'must be a non-empty string')
  }
  if (typeof state.abbreviation !== 'string' || !state.abbreviation) {
    addError('state.abbreviation', 'must be a non-empty string')
  }
  if (typeof state.asOfYear !== 'number') {
    addError('state.asOfYear', 'must be a number')
  }

  // Validate sources
  const sources = data.sources
  if (typeof sources !== 'object' || Array.isArray(sources)) {
    addError('sources', 'must be an object')
  } else {
    for (const [key, source] of Object.entries(sources)) {
      validateSource(source, key)
    }
  }

  // Validate state-level metrics
  if (data.metrics) {
    if (data.metrics.averageTaxRate) {
      validateSeries(data.metrics.averageTaxRate, 'metrics.averageTaxRate', sources)
    }
  }

  // Validate counties
  data.counties.forEach((county: any, countyIndex: number) => {
    const countyPath = `counties[${countyIndex}]`

    if (typeof county.name !== 'string' || !county.name) {
      addError(`${countyPath}.name`, 'must be a non-empty string')
    }
    if (typeof county.slug !== 'string' || !county.slug) {
      addError(`${countyPath}.slug`, 'must be a non-empty string')
    }

    // Validate county metrics
    if (county.metrics) {
      if (county.metrics.averageResidentialTaxBill) {
        validateSeries(
          county.metrics.averageResidentialTaxBill,
          `${countyPath}.metrics.averageResidentialTaxBill`,
          sources
        )
      }
      if (county.metrics.effectiveTaxRate) {
        validateSeries(
          county.metrics.effectiveTaxRate,
          `${countyPath}.metrics.effectiveTaxRate`,
          sources
        )
      }
    }

    // Validate towns
    if (county.towns && Array.isArray(county.towns)) {
      county.towns.forEach((town: any, townIndex: number) => {
        const townPath = `${countyPath}.towns[${townIndex}]`

        if (typeof town.name !== 'string' || !town.name) {
          addError(`${townPath}.name`, 'must be a non-empty string')
        }
        if (typeof town.slug !== 'string' || !town.slug) {
          addWarning(
            `${townPath}.slug`,
            'missing or empty; add slug for routing (e.g. "galloway") or run adapter to derive'
          )
        }
        if (typeof town.asOfYear !== 'number') {
          addWarning(
            `${townPath}.asOfYear`,
            'missing; set when metrics are merged (merge scripts set it)'
          )
        }

        // Validate town metrics
        if (town.metrics) {
          if (town.metrics.averageResidentialTaxBill) {
            validateSeries(
              town.metrics.averageResidentialTaxBill,
              `${townPath}.metrics.averageResidentialTaxBill`,
              sources
            )
          }
          if (town.metrics.effectiveTaxRate) {
            validateSeries(
              town.metrics.effectiveTaxRate,
              `${townPath}.metrics.effectiveTaxRate`,
              sources
            )
          }
          if (town.metrics.medianHomeValue) {
            validateSeries(
              town.metrics.medianHomeValue,
              `${townPath}.metrics.medianHomeValue`,
              sources
            )
          }
        }
      })
    }
  })
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  const filePath = args[0] || path.join(__dirname, '../data/states/new-jersey.json')

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`)
    process.exit(1)
  }

  let data: any
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    data = JSON.parse(content)
  } catch (error) {
    console.error(`Error reading/parsing JSON file: ${error}`)
    process.exit(1)
  }

  validateStateData(data)

  // Print results
  if (warnings.length > 0) {
    console.warn('\n⚠️  Warnings:')
    warnings.forEach(({ path, message }) => {
      console.warn(`  ${path}: ${message}`)
    })
  }

  if (errors.length > 0) {
    console.error('\n❌ Errors:')
    errors.forEach(({ path, message }) => {
      console.error(`  ${path}: ${message}`)
    })
    console.error(`\nFound ${errors.length} error(s)`)
    process.exit(1)
  }

  console.log('✅ Validation passed!')
  if (warnings.length > 0) {
    console.log(`   (${warnings.length} warning(s))`)
  }
}

if (require.main === module) {
  main()
}
