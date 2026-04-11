# Year-Aware Data Model

**Last updated:** April 3, 2026  

This document describes how property tax data is stored and consumed with **tax years**, **time-series metrics**, and **centralized sources**—as implemented in the repo today.

---

## 1. Goals

- Represent county and town metrics as **sorted time series** (up to five points per metric).
- Anchor UI and SEO copy to a coherent **`asOfYear`** without mislabeling stale data as the current calendar year.
- Deduplicate attribution via a top-level **`sources`** map and **`sourceRef`** on each datapoint.
- Resolve “latest” values through shared helpers so pages, overviews, and tooling stay consistent.

---

## 2. Canonical JSON shape (`data/states/{state}.json`)

Runtime types live in `lib/data/types.ts`. Each state file loads as **`StateData`**:

| Section | Purpose |
|--------|---------|
| **`state`** | `StateMeta`: `name`, `slug`, `abbreviation`, **`asOfYear`**, optional `primarySources` |
| **`sources`** | Map of source id → `Source` (publisher, title, type, `homepageUrl`, optional `yearUrls`, notes) |
| **`metrics`** | Optional `StateMetrics` (e.g. `averageTaxRate` series) |
| **`counties`** | `CountyData[]` |

**County (`CountyData`)**

- `name`, `slug`, optional `asOfYear`, optional `neighborCounties`, optional **`metrics`** (`CountyMetrics`), optional **`towns`**

**Town (`TownData`)**

- `name`, `slug`, optional `displayName`, optional **`asOfYear`**, optional **`metrics`** (`TownMetrics`), optional `overview` (`TownOverview`), optional `copy`, `overrides`, `rollout`
- Legacy: **`avgRate`** may still appear for rates-style UX; prefer metric series when present

**Metric series**

- Keys used in code include: `averageResidentialTaxBill`, `effectiveTaxRate`, `medianHomeValue` (town/county), `averageTaxRate` (state)
- Each series is an array of **`DataPoint`**: `{ year, value, unit, sourceRef }`
- **`unit`** is `USD` or `PERCENT` (see validation in `scripts/validate-state-data.ts`)
- **`sourceRef`** must exist in `state.sources`

Example (abbreviated; matches live NJ data patterns):

```json
{
  "state": {
    "name": "New Jersey",
    "slug": "new-jersey",
    "abbreviation": "NJ",
    "asOfYear": 2024
  },
  "sources": {
    "nj_modiv_avg_restax": {
      "publisher": "NJ Division of Taxation",
      "title": "MOD IV Average Residential Tax Report",
      "type": "pdf",
      "homepageUrl": "https://www.nj.gov/treasury/taxation/lpt/statdata.shtml",
      "yearUrls": {
        "2023": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2023.pdf",
        "2024": "https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax2024.pdf"
      }
    }
  },
  "metrics": {
    "averageTaxRate": [
      {
        "year": 2024,
        "value": 2.02,
        "unit": "PERCENT",
        "sourceRef": "nj_modiv_avg_restax"
      }
    ]
  },
  "counties": [
    {
      "name": "Bergen",
      "slug": "bergen",
      "neighborCounties": ["Passaic", "Hudson"],
      "towns": [
        {
          "name": "Ridgewood",
          "slug": "ridgewood",
          "asOfYear": 2025,
          "metrics": {
            "averageResidentialTaxBill": [
              {
                "year": 2024,
                "value": 20375,
                "unit": "USD",
                "sourceRef": "nj_modiv_avg_restax"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## 3. Loading and normalization

- **`lib/geo.ts`** imports raw JSON, runs **`normalizeStateData`** from `lib/data/adapter.ts`, and registers states (e.g. `new-jersey`, `texas`).
- **`normalizeStateData`**: validates structure; for each county, validates metric series with **`assertSorted`** and **`assertMaxLength`** (`lib/data/metrics.ts`, max length 5).
- **`normalizeTownData`** (private in adapter): sets town `slug` if missing; derives **`asOfYear`** from explicit `asOfYear`, or `overview.effectiveTaxRateYear`, or `overview.asOfYear`—**not** from the current calendar year (avoids mislabeling tax-year data).

---

## 4. Reading “latest” and year labels

- **`lib/data/town-helpers.ts`**: **`getMetricLatest`**, **`getMetricSeries`**, **`getLatest`**, **`getLastN`**, **`resolveSource`**, YoY helpers—town series with **fallback to county** when a town point is missing.
- **`lib/data/metrics.ts`**: **`getLatest`**, **`getLastN`**, **`computeYoY`**, **`computeYoYStats`** on raw `MetricSeries` (used where town/county context is not needed).
- **Town overview:** `lib/town-overview/resolve-page-overview.ts` builds the rich **`TownOverview`** for town pages (`enrichOverviewYearsFromMetrics`, trend pick, comparisons). **`buildTownOverviewFromMetrics`** (`lib/town-overview/build-from-metrics.ts`) is used when constructing overview from metrics (e.g. merge tooling).
- **SEO year:** `resolveTownSeoYear` in `lib/seo/townMetadata.ts` prefers overview/metric years, then town → county → state `asOfYear`, else calendar year.
- **Copy context:** `lib/data/copy.ts` **`buildTownCopyContext`** uses **`asOfYear`** cascade town → county → state.

---

## 5. UI and content (not legacy JSON prose)

- **County hubs:** Copy is **assembled in code** (`lib/content/countyContent.ts`, `components/county/CountyPageSections.tsx`), not from long `county.copy` blobs in JSON. Keep **facts** (metrics, neighbors, sources) in data.
- **Town pages:** Use `getMetricLatest`, overview resolution, and state capabilities; see `app/[state]/[county]/[town]/page.tsx`.

---

## 6. Validation and updates

- **Validate data:** `npm run validate:data` → `scripts/validate-state-data.ts` (structure, `sourceRef`, units, year ranges, series length).
- **Annual / merge workflows:** See `docs/ANNUAL_DATA_UPDATE.md` and merge scripts under `scripts/` (e.g. `merge-state-metrics.ts`).
- **`data/schema/state-data.schema.json`:** Historical JSON Schema artifact; **canonical contract is `lib/data/types.ts` + `validate-state-data.ts`**. If the schema disagrees with live files, treat types and validator as source of truth.

---

## 7. File reference (implementation)

| Area | Location |
|------|----------|
| Types | `lib/data/types.ts` |
| Normalize / validate series | `lib/data/adapter.ts`, `lib/data/metrics.ts` |
| Town + county metric access | `lib/data/town-helpers.ts` |
| Town overview | `lib/town-overview/*`, `lib/town-overview/types.ts` |
| State registry | `lib/geo.ts` |
| County page copy | `lib/content/countyContent.ts` |
| SEO titles / years | `lib/seo/townMetadata.ts` |
| Data validation CLI | `scripts/validate-state-data.ts` |

---

## 8. Tests

- `npm test` includes suites that touch metrics and content (`tests/`).
- Run `npm run validate:data` after editing `data/states/*.json`.

---

## 9. Removed or outdated (vs older drafts of this doc)

- There is **no** `HistoricalMetrics.tsx` component in the repo.
- **`getCountyLatestTaxBill` / `getCountyLatestRate`** are not part of the current adapter; use **`getMetricLatest`** from `town-helpers` with the appropriate `metricKey` and town/county context.
- Metric points use **`sourceRef` + `sources`**, not inline `{ name, reference, year }` objects on each datapoint.
- **Do not** assume `avgResidentialTaxBill2024` or flat state JSON (`name`/`slug` at root); live files use the nested **`state` / `sources` / `counties`** shape.
