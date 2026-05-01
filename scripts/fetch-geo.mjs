/**
 * One-time script to download county GeoJSON files from the US Census Bureau.
 *
 * Run once after cloning (requires internet access):
 *   node scripts/fetch-geo.mjs
 *
 * Files are saved to public/geo/ and should be committed to the repo so
 * the map renders without needing a network call at build time.
 *
 * Sources: US Census Bureau Cartographic Boundary Files (public domain)
 * https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../public/geo')

/** State FIPS → output filename, Census resolution */
const STATES = [
  { fips: '34', slug: 'new-jersey', resolution: '500k', desc: 'New Jersey' },
  { fips: '48', slug: 'texas',      resolution: '5m',   desc: 'Texas' },
]

/**
 * Census Cartographic Boundary JSON URL for county-level data.
 * 500k = 1:500,000 (detailed, good for NJ's small size)
 * 5m  = 1:5,000,000 (simplified, fine for TX's large area)
 */
function censusUrl(fips, resolution, year = '2023') {
  return `https://www2.census.gov/geo/tiger/GENZ${year}/json/cb_${year}_${fips}_county_${resolution}.json`
}

/**
 * Fallback: download all-US counties from plotly (large ~24 MB) and filter by state FIPS.
 * Only used if the Census URL fails.
 */
const PLOTLY_ALL_COUNTIES_URL =
  'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json'

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function filterByState(allCountiesGeojson, stateFips) {
  const features = allCountiesGeojson.features.filter(
    f => String(f.properties.STATE || f.properties.STATEFP || '').padStart(2, '0') === stateFips
  )
  return { type: 'FeatureCollection', features }
}

async function downloadState({ fips, slug, resolution, desc }) {
  const outPath = path.join(OUT_DIR, `${slug}-counties.json`)
  if (existsSync(outPath)) {
    console.log(`  ✓ ${desc}: already exists at public/geo/${slug}-counties.json`)
    return
  }

  const primaryUrl = censusUrl(fips, resolution)
  console.log(`  Downloading ${desc} from Census Bureau...`)
  console.log(`    ${primaryUrl}`)

  let geojson
  try {
    geojson = await fetchJson(primaryUrl)
    console.log(`  ✓ ${desc}: downloaded ${geojson.features.length} counties`)
  } catch (err) {
    console.warn(`  ⚠ Census URL failed (${err.message}). Trying Plotly fallback...`)
    try {
      const all = await fetchJson(PLOTLY_ALL_COUNTIES_URL)
      geojson = await filterByState(all, fips)
      console.log(`  ✓ ${desc}: got ${geojson.features.length} counties from Plotly fallback`)
    } catch (err2) {
      console.error(`  ✗ Both sources failed for ${desc}:`)
      console.error(`    Census: ${err.message}`)
      console.error(`    Plotly: ${err2.message}`)
      return
    }
  }

  await writeFile(outPath, JSON.stringify(geojson), 'utf8')
  const sizeKb = Math.round(JSON.stringify(geojson).length / 1024)
  console.log(`  ✓ Saved → public/geo/${slug}-counties.json (${sizeKb} KB)`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  console.log('Fetching county GeoJSON files...\n')

  for (const state of STATES) {
    await downloadState(state)
  }

  console.log('\nDone. Commit the files in public/geo/ to avoid needing this step again.')
  console.log('Then run: npm install (to install react-simple-maps if not already done)')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
