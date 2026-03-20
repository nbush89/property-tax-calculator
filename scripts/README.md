# NJ Town Metrics Scraping Scripts

**→ For run order and what each script does, see [RUNNING-SCRIPTS.md](./RUNNING-SCRIPTS.md).**

## Overview

**Primary CLI:** `source-state-metrics.ts` / `merge-state-metrics.ts` (see [RUNNING-SCRIPTS.md](./RUNNING-SCRIPTS.md)). NJ Tier-1 towns are configured in **`state-metrics/nj/config.ts`**.

For New Jersey, sourcing uses:

- **Census Data API** (ACS 5-year estimates) for median home values
- **NJ Division of Taxation** GTR PDFs for effective tax rates
- **MOD IV** (XLSX/PDF) for average residential tax bills

## Setup

1. Install dependencies (if not already installed):

   ```bash
   npm install
   ```

   The script requires:
   - `pdf-parse` - for parsing PDF files
   - `tsx` - for running TypeScript files directly

## Usage

Run the script to fetch data for the last 5 years:

```bash
npm run scrape-town-metrics
npm run merge-town-metrics
# Or full NJ (ACS + GTR + MOD IV) in one file:
npx tsx scripts/source-state-metrics.ts --state new-jersey --out /tmp/nj-full.json
npx tsx scripts/merge-state-metrics.ts --state new-jersey /tmp/nj-full.json
npx tsx scripts/apply-town-overviews.ts
```

After merging metrics, run **`apply-town-overviews.ts`** so every town gets a standardized `overview` object (built from existing town/county/state metrics). It logs warnings for towns missing `overview.avgResidentialTaxBill` or `overview.effectiveTaxRatePct` but does not fail the build.

## Updating for New Years

To update the data for a new year:

1. Edit `YEARS` in the `main()` function:

   ```typescript
   const YEARS = [2020, 2021, 2022, 2023, 2024, 2025] // Add new year
   ```

2. Run the script again - it will fetch data for all years in the list

3. The script automatically keeps only the last 5 years in the output

## Output Format

The script outputs JSON suitable for `town.metrics` in `/data/states/new-jersey.json`:

```json
{
  "Montclair": {
    "medianHomeValue": [
      {"year": 2020, "value": 650000, "unit": "USD", "sourceRef": "us_census_acs_profile_dp04"},
      ...
    ],
    "effectiveTaxRate": [
      {"year": 2020, "value": 1.109, "unit": "PERCENT", "sourceRef": "nj_div_taxation_general_effective_tax_rates"},
      ...
    ],
    "debug": {
      "acsMatchKey": "MONTCLAIR",
      "pdfDistrict": "MONTCLAIR TWP",
      "pdfMatchKey": "MONTCLAIR TWP"
    }
  },
  ...
}
```

## Source References

The script uses these source reference keys (add them to `/data/states/new-jersey.json` `sources` map):

- `us_census_acs_profile_dp04` - US Census Bureau ACS 5-Year Profile, DP04 (Housing Characteristics)
- `nj_div_taxation_general_effective_tax_rates` - NJ Division of Taxation General and Effective Tax Rates PDFs

## Troubleshooting

If a town shows `[MISSING]` in the output:

1. Check the `debug` section to see what keys were used for matching
2. Update `PDF_DISTRICT_OVERRIDES` if the PDF district name doesn't match
3. Verify the town name normalization is working correctly

## Adding the next batch of towns

1. **Add towns to JSON** (`/data/states/new-jersey.json`): Under the correct county `towns` array, add an object with at least `name`, `slug` (use `slugifyLocation` rules: lowercase, hyphens, no punctuation), and optionally `asOfYear`, `rollout: { tier, featured, isReady, rank }` so they appear in the county “Featured towns” list.
2. **Add towns to** `scripts/state-metrics/nj/config.ts`: append to `NJ_TIER1` (and `PDF_DISTRICT_OVERRIDES` if GTR PDF names differ). Match MOD IV report names for `townName`.
3. **Run pipeline**: full NJ source + merge, or MOD IV only via `--only modiv` + merge. Check stderr for unmatched towns.
4. **Slugging**: Use a single slug function everywhere (`utils/locationUtils.ts`: `slugifyLocation` / `slugifyTown`). Town slugs must be stable (e.g. "Atlantic City" → `atlantic-city`).

## Notes

- ACS data may have a 1-2 year lag (e.g., 2024 data may not be available until 2025)
- PDF parsing is best-effort; if structure changes, the regex may need updates
- The script downloads PDFs in memory (no temp files needed)
- Source script uses `SOURCE_REF = 'nj_modiv_avg_restax'` to match the JSON `sources` key; merge script writes into `town.metrics.averageResidentialTaxBill` and only updates towns that already exist in JSON with a matching `slug`
