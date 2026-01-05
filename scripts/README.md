# NJ Town Metrics Scraping Scripts

## Overview

`source-nj-tier1-metrics.ts` scrapes effective tax rates and median home values for Tier-1 NJ towns from:

- **Census Data API** (ACS 5-year estimates) for median home values
- **NJ Division of Taxation PDFs** for effective tax rates

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
npm run scrape-town-metrics > town_metrics_output.json
```

Or run directly with tsx:

```bash
npx tsx scripts/source-nj-tier1-metrics.ts > town_metrics_output.json
```

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

## Notes

- ACS data may have a 1-2 year lag (e.g., 2024 data may not be available until 2025)
- PDF parsing is best-effort; if structure changes, the regex may need updates
- The script downloads PDFs in memory (no temp files needed)
