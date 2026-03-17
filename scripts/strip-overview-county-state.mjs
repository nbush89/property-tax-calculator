#!/usr/bin/env node
/**
 * Remove county/state duplicate fields from town overviews in new-jersey.json.
 * These are now derived at render time from county.metrics and state.metrics.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jsonPath = path.join(__dirname, '..', 'data', 'states', 'new-jersey.json')

const KEYS_TO_REMOVE = ['countyAvgTaxBill', 'countyEffectiveRatePct', 'stateAvgTaxBill', 'stateEffectiveTaxRatePct']

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
let removed = 0

for (const county of data.counties ?? []) {
  for (const town of county.towns ?? []) {
    if (town.overview && typeof town.overview === 'object') {
      for (const key of KEYS_TO_REMOVE) {
        if (key in town.overview) {
          delete town.overview[key]
          removed++
        }
      }
    }
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log(`Removed ${removed} county/state fields from town overviews in ${jsonPath}`)
