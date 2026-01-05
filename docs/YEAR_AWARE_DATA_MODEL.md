# Year-Aware Data Model Implementation

## A) Current Structure Inventory

### Current JSON Shape (`/data/states/new-jersey.json`)

**Top-level keys:**

- `name`: string (e.g., "New Jersey")
- `slug`: string (e.g., "new-jersey")
- `abbreviation`: string (e.g., "NJ")
- `avgTaxRate`: number (state-level average, e.g., 0.0202)
- `source`: object with `name`, `year`, `url`
- `counties`: array of county objects

**County object structure:**

- `name`: string
- `slug`: string
- `avgEffectiveRate`: number
- `avgResidentialTaxBill2024`: number (single year, hardcoded to 2024)
- `neighborCounties`: string[] (optional)
- `towns`: array of `{ name: string, avgRate: number }`
- `copy`: object with `paragraphs: string[]` and `disclaimer: string`

**Current code usage:**

- `lib/geo.ts`: Defines `StateData` and `CountyData` types, provides `getStateData()`, `getCountyBySlug()`, `formatUSD()`
- `app/new-jersey/[county]/page.tsx`: Reads `county.avgResidentialTaxBill2024` directly for display
- Direct field access: `county.avgResidentialTaxBill2024`, `county.avgEffectiveRate`

## B) Proposed Evolved JSON Structure

### Key Changes:

1. **Add `asOfYear`** at state and county levels (points to latest data year)
2. **Add `metrics` object** with time series arrays (up to 5 years)
3. **Keep all existing fields** for backward compatibility during transition
4. **Preserve copy paragraphs** exactly as-is (no content changes)

### Structure:

```json
{
  "name": "New Jersey",
  "slug": "new-jersey",
  "abbreviation": "NJ",
  "asOfYear": 2024,
  "source": { ... },
  "metrics": {
    "averageTaxRate": [ /* optional state-level series */ ]
  },
  "counties": [
    {
      "name": "Bergen",
      "slug": "bergen",
      "asOfYear": 2024,
      "metrics": {
        "averageResidentialTaxBill": [
          { "year": 2020, "value": 13200, "unit": "USD", "source": {...} },
          { "year": 2021, "value": 13350, "unit": "USD", "source": {...} },
          { "year": 2022, "value": 13450, "unit": "USD", "source": {...} },
          { "year": 2023, "value": 13500, "unit": "USD", "source": {...} },
          { "year": 2024, "value": 13600, "unit": "USD", "source": {...} }
        ],
        "effectiveTaxRate": [
          { "year": 2024, "value": 0.0231, "unit": "rate", "source": {...} }
        ]
      },
      "copy": { /* unchanged */ },
      "towns": [ /* unchanged structure */ ]
    }
  ]
}
```

## C) Example JSON Snippets

### County Example (Bergen with 5 years):

```json
{
  "name": "Bergen",
  "slug": "bergen",
  "asOfYear": 2024,
  "avgEffectiveRate": 0.0231,
  "avgResidentialTaxBill2024": 13600,
  "neighborCounties": ["Passaic", "Hudson", "Essex", "Morris"],
  "metrics": {
    "averageResidentialTaxBill": [
      {
        "year": 2020,
        "value": 13200,
        "unit": "USD",
        "source": {
          "name": "NJ Division of Taxation – MOD IV Average Residential Tax Report",
          "reference": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2020.pdf",
          "year": 2020
        }
      },
      {
        "year": 2021,
        "value": 13350,
        "unit": "USD",
        "source": {
          "name": "NJ Division of Taxation – MOD IV Average Residential Tax Report",
          "reference": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2021.pdf",
          "year": 2021
        }
      },
      {
        "year": 2022,
        "value": 13450,
        "unit": "USD",
        "source": {
          "name": "NJ Division of Taxation – MOD IV Average Residential Tax Report",
          "reference": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2022.pdf",
          "year": 2022
        }
      },
      {
        "year": 2023,
        "value": 13500,
        "unit": "USD",
        "source": {
          "name": "NJ Division of Taxation – MOD IV Average Residential Tax Report",
          "reference": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2023.pdf",
          "year": 2023
        }
      },
      {
        "year": 2024,
        "value": 13600,
        "unit": "USD",
        "source": {
          "name": "NJ Division of Taxation – MOD IV Average Residential Tax Report",
          "reference": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2024.pdf",
          "year": 2024
        }
      }
    ],
    "effectiveTaxRate": [
      {
        "year": 2024,
        "value": 0.0231,
        "unit": "rate",
        "source": {
          "name": "NJ Division of Taxation – MOD IV Average Residential Tax Report",
          "reference": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2024.pdf",
          "year": 2024
        }
      }
    ]
  },
  "copy": {
    "paragraphs": [
      "Bergen County is consistently one of the highest-tax areas in New Jersey, and tax bills can vary widely by municipality even for similarly priced homes.",
      "Use this page to estimate annual and monthly property tax costs for planning and comparison. Enter your property value and select your municipality if known to refine the estimate.",
      "According to the NJ Division of Taxation's 2024 Average Residential Tax Report, the average residential tax bill in Bergen County was about $13,600.",
      "This calculator is best used for planning and comparison: try different home values, and (if available in your dataset) select a town to see how the estimate changes."
    ],
    "disclaimer": "This tool provides estimates, not official tax bills. Always verify with your local tax assessor."
  },
  "towns": [
    { "name": "Ridgewood", "avgRate": 0.0034 },
    { "name": "Teaneck", "avgRate": 0.0032 }
  ]
}
```

### Town Example (if towns had metrics):

```json
{
  "name": "Ridgewood",
  "avgRate": 0.0034,
  "metrics": {
    "averageTaxRate": [
      {
        "year": 2023,
        "value": 0.0033,
        "unit": "rate",
        "source": {
          "name": "Ridgewood Township Tax Assessor",
          "reference": "https://example.com/ridgewood-2023",
          "year": 2023
        }
      },
      {
        "year": 2024,
        "value": 0.0034,
        "unit": "rate",
        "source": {
          "name": "Ridgewood Township Tax Assessor",
          "reference": "https://example.com/ridgewood-2024",
          "year": 2024
        }
      }
    ]
  }
}
```

## D) JSON Schema

See `/data/schema/state-data.schema.json` for the complete JSON Schema (draft 2020-12).

**Key validation rules:**

- `year`: integer between 2000 and 2030
- Series arrays: maxItems = 5
- Datapoint requires: `year`, `value`, `unit`, `source`
- Source requires: `name` (minimum), optional `reference` and `year`
- Note: Sorting by year ascending is documented but not enforced by schema (use runtime check)

## E) TypeScript Types + Helpers

### Files Created:

- `/lib/data/types.ts`: All TypeScript interfaces
- `/lib/data/metrics.ts`: Helper functions (`getLatest`, `getLastN`, `computeYoY`, `assertSorted`)
- `/lib/data/adapter.ts`: Migration adapter (`normalizeStateData`, `getCountyLatestTaxBill`, `getCountyLatestRate`)

### Key Functions:

```typescript
// Get latest value from a series
getLatest(series: MetricSeries): MetricDatapoint | null

// Get last N years
getLastN(series: MetricSeries, n: number = 5): MetricSeries

// Compute year-over-year change
computeYoY(series: MetricSeries): number | null

// Validate sorting (dev-only)
assertSorted(series: MetricSeries, seriesName?: string): void

// Backward compatibility helpers
getCountyLatestTaxBill(county: CountyData): number | null
getCountyLatestRate(county: CountyData): number | null
```

## F) Migration Plan

### Step 1: Wrap Existing 2024 Data

The `normalizeStateData()` adapter automatically wraps existing `avgResidentialTaxBill2024` values into `metrics.averageResidentialTaxBill` arrays. No manual JSON changes needed initially.

### Step 2: Add Historical Data (Manual)

When historical data becomes available, add entries to the arrays:

```json
"metrics": {
  "averageResidentialTaxBill": [
    { "year": 2022, "value": 13450, "unit": "USD", "source": {...} },
    { "year": 2023, "value": 13500, "unit": "USD", "source": {...} },
    { "year": 2024, "value": 13600, "unit": "USD", "source": {...} }
  ]
}
```

### Step 3: Component Updates

- ✅ Updated `lib/geo.ts` to use adapter
- ✅ Updated county page to use `getCountyLatestTaxBill()` helper
- ✅ Added `HistoricalMetrics` component (renders when 2+ years available)

### Step 4: Validation

Run validation script:

```bash
npx tsx scripts/validate-data.ts
```

## Implementation Summary

### Files Created:

1. `/data/schema/state-data.schema.json` - JSON Schema
2. `/lib/data/types.ts` - TypeScript types
3. `/lib/data/metrics.ts` - Helper functions
4. `/lib/data/adapter.ts` - Migration adapter
5. `/components/location/HistoricalMetrics.tsx` - UI component
6. `/scripts/validate-data.ts` - Validation script
7. `/docs/YEAR_AWARE_DATA_MODEL.md` - This documentation

### Files Modified:

1. `/lib/geo.ts` - Uses adapter, exports new types
2. `/app/new-jersey/[county]/page.tsx` - Uses helpers, shows historical section

### Backward Compatibility:

- ✅ Legacy fields (`avgResidentialTaxBill2024`, `avgEffectiveRate`) preserved
- ✅ Adapter automatically wraps single-year data into arrays
- ✅ Helper functions provide seamless access to latest values
- ✅ Existing routes continue to work without changes

### Next Steps:

1. Add historical data to JSON files as it becomes available
2. Update town pages to use metrics (if needed)
3. Consider adding charts/visualizations for historical trends
