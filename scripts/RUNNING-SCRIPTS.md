# Running the Scripts

This doc describes which scripts to run, in what order, and what each one does. All commands assume you're in the project root and have run `npm install`.

---

## Run order (full pipeline)

Run in this order. Each step uses the output of the previous step or reads/writes `data/states/new-jersey.json`.

| Step | Script                       | Purpose                                                        |
| ---- | ---------------------------- | -------------------------------------------------------------- |
| 1    | `source-nj-tier1-metrics.ts` | Fetch effective tax rate + median home value for Tier-1 towns  |
| 2    | `merge-nj-tier1-metrics.ts`  | Merge that data into `new-jersey.json` (town metrics)          |
| 3    | `source-nj-avg-tax-bill.ts`  | Fetch county + town average residential tax bill (MOD IV)      |
| 4    | `merge-nj-avg-tax-bill.ts`   | Merge that data into `new-jersey.json` (county + town metrics) |
| 5    | `apply-town-overviews.ts`    | Build standardized `town.overview` for every town from metrics |

Optional after step 5: run `validate-data.ts`, `validate-state-data.ts`, or **`validate-tier1-overviews.ts`** to check the state JSON. The Tier 1 script ensures each Tier 1 town has town-level metrics and overview values that differ from county (run with `--report` to see a per-town summary).

---

## Commands (copy-paste)

```bash
# 1. Fetch Tier-1 metrics (effective rate + median home value)
npx tsx scripts/source-nj-tier1-metrics.ts > /tmp/nj-tier1-metrics.json

# 2. Merge Tier-1 metrics into state JSON
npx tsx scripts/merge-nj-tier1-metrics.ts /tmp/nj-tier1-metrics.json

# 3. Fetch average tax bill data (counties + towns)
npx tsx scripts/source-nj-avg-tax-bill.ts > /tmp/nj-avg-tax-bill.json

# 4. Merge average tax bill into state JSON
npx tsx scripts/merge-nj-avg-tax-bill.ts /tmp/nj-avg-tax-bill.json

# 5. Build town overviews from merged metrics (required for town pages)
npx tsx scripts/apply-town-overviews.ts
```

Or as a one-liner (same order):

```bash
npx tsx scripts/source-nj-tier1-metrics.ts > /tmp/nj-tier1-metrics.json && \
npx tsx scripts/merge-nj-tier1-metrics.ts /tmp/nj-tier1-metrics.json && \
npx tsx scripts/source-nj-avg-tax-bill.ts > /tmp/nj-avg-tax-bill.json && \
npx tsx scripts/merge-nj-avg-tax-bill.ts /tmp/nj-avg-tax-bill.json && \
npx tsx scripts/apply-town-overviews.ts
```

---

## What each script does

### 1. `source-nj-tier1-metrics.ts`

- **What it does:** Fetches data for a fixed list of Tier-1 NJ towns (Montclair, Hoboken, Princeton, Ridgewood, Paramus, Summit, Westfield, Morristown, Edison, Cherry Hill).
  - **Effective tax rate:** from NJ Division of Taxation “General & Effective Tax Rates” PDFs (by year).
  - **Median home value:** from U.S. Census ACS 5-year API (DP04_0089E).
- **Input:** None (uses config inside the script: years, town list, PDF URL template, Census variable).
- **Output:** JSON to **stdout**. Redirect to a file (e.g. `/tmp/nj-tier1-metrics.json`) and pass that file to `merge-nj-tier1-metrics.ts`.
- **Notes:** Needs network. PDF parsing is best-effort; if NJ changes the PDF layout, the script may need updates.

---

### 2. `merge-nj-tier1-metrics.ts`

- **What it does:** Reads the JSON produced by `source-nj-tier1-metrics.ts` and merges it into `data/states/new-jersey.json`:
  - Sets `town.metrics.medianHomeValue` and `town.metrics.effectiveTaxRate` for each Tier-1 town (matched by town name and county slug).
  - Ensures source entries exist in `stateData.sources` for Census and NJ Division of Taxation.
  - Updates town `asOfYear` from the latest year in the merged series.
- **Input:** Path to the Tier-1 metrics JSON file (e.g. `/tmp/nj-tier1-metrics.json`).
- **Output:** Overwrites `data/states/new-jersey.json`.
- **Notes:** Towns must already exist in the state JSON; the script only updates towns in its internal `TIER1_TOWN_TO_COUNTY` map.

---

### 3. `source-nj-avg-tax-bill.ts`

- **What it does:** Fetches **average residential tax bill** (and county totals) from NJ’s MOD IV “Average Residential Tax” reports.
  - **Counties:** All 21 NJ counties.
  - **Towns:** A configured list (Tier-1 + more towns in the script’s `TIER1` array).
  - Prefers XLSX when available (e.g. 2022), otherwise tries PDFs.
- **Input:** None (years and town list are in the script).
- **Output:** JSON to **stdout**. Redirect to a file (e.g. `/tmp/nj-avg-tax-bill.json`) and pass that file to `merge-nj-avg-tax-bill.ts`.
- **Notes:** Needs network. Town names must match how they appear in the MOD IV report (script has `townName` per entry).

---

### 4. `merge-nj-avg-tax-bill.ts`

- **What it does:** Reads the JSON from `source-nj-avg-tax-bill.ts` and merges it into `data/states/new-jersey.json`:
  - **Counties:** Sets `county.metrics.averageResidentialTaxBill` and updates county `asOfYear`.
  - **Towns:** Sets `town.metrics.averageResidentialTaxBill` for each town keyed by `countySlug/townSlug` (town must already exist in the JSON).
  - Adds the MOD IV source to `stateData.sources` if missing.
- **Input:** Path to the avg-tax-bill JSON file (e.g. `/tmp/nj-avg-tax-bill.json`).
- **Output:** Overwrites `data/states/new-jersey.json`.
- **Notes:** Only towns that exist in the state JSON and appear in the source output get updated.

---

### 5. `apply-town-overviews.ts`

- **What it does:** After metrics are in `new-jersey.json`, builds a standardized **`town.overview`** for **every** town from existing town/county/state metrics (using `buildTownOverviewFromMetrics`). Writes a `sources` array and optional trend fields (e.g. `trendPct`, `fiveYearTrendPct` when enough years exist).
- **Input:** Reads only `data/states/new-jersey.json` (no CLI args).
- **Output:** Overwrites `data/states/new-jersey.json` with `town.overview` set on each town.
- **Validation (warnings only):** Logs towns missing `overview.avgResidentialTaxBill` or `overview.effectiveTaxRatePct`. Does **not** exit with an error.
- **Notes:** **Must run after** both merge scripts so county and town metrics (and state metrics) are present. Town pages use `town.overview` for the “Town at a glance” block and metadata.

---

### Optional: `validate-data.ts`

- **What it does:** Validates state JSON files (e.g. `new-jersey.json`): structure, data types, datapoint fields (year, value, unit, sourceRef), series length limits, source refs, etc.
- **Input:** Typically run without args (or see script for path usage); validates state data under `data/states/`.
- **Output:** Logs errors/warnings; may exit non-zero on validation failure.
- **When to run:** After the full pipeline (or after any merge) to check the resulting JSON.

---

### Optional: `validate-state-data.ts`

- **What it does:** Validates state JSON: structure (state, sources, counties/towns), source refs in datapoints, series length ≤ 5, and datapoint fields. Accepts two source shapes (canonical `publisher`/`title`/… or alternate `name`/`url` from merge scripts). Missing town `slug` or `asOfYear` produce **warnings** only (not errors).
- **Input:** Optional path to state JSON; defaults to `data/states/new-jersey.json`.
- **Output:** Exit 0 if no errors; warnings for missing slug/asOfYear. Exit 1 on structural/sourceRef errors.
- **When to run:** After the full pipeline to double-check consistency. Many towns may show slug/asOfYear warnings until you add slugs or run merge scripts.

### Optional: `validate-tier1-overviews.ts`

- **What it does:** Cross-checks Tier 1 towns: ensures each has town-level metrics (averageResidentialTaxBill, effectiveTaxRate) and that overview values differ from county (so town ≠ county when we have town data). Fails if any Tier 1 town is missing metrics or shows county-only values.
- **Input:** None (reads `data/states/new-jersey.json`). Use `--report` to print a per-town summary (town vs county values) without failing.
- **Output:** Exit 0 if all Tier 1 towns pass; exit 1 and list issues otherwise. With `--report`, prints a table of each Tier 1 town’s bill/rate vs county.
- **When to run:** After the full pipeline (or after apply-town-overviews) to confirm Tier 1 towns have differing values.
- **Commands:** `npm run validate:tier1-overviews` or `npm run validate:tier1-overviews:report`

---

## Quick reference

| Script                        | Run when                  | Reads                           | Writes                   |
| ----------------------------- | ------------------------- | ------------------------------- | ------------------------ |
| `source-nj-tier1-metrics.ts`  | First (fetch)             | —                               | stdout → save to file    |
| `merge-nj-tier1-metrics.ts`   | Second                    | state JSON + tier1 metrics file | `new-jersey.json`        |
| `source-nj-avg-tax-bill.ts`   | Third (fetch)             | —                               | stdout → save to file    |
| `merge-nj-avg-tax-bill.ts`    | Fourth                    | state JSON + avg-tax-bill file  | `new-jersey.json`        |
| `apply-town-overviews.ts`     | Fifth (after both merges) | `new-jersey.json`               | `new-jersey.json`        |
| `validate-data.ts`            | Optional                  | state JSON                      | —                        |
| `validate-state-data.ts`      | Optional                  | state JSON                      | —                        |
| `validate-tier1-overviews.ts` | Optional                  | state JSON                      | — (`--report` for table) |

---

## Prerequisites

- Node.js and `npm install` (includes `tsx`, `pdf-parse`, `xlsx` as needed).
- **source** scripts need network access (Census API, NJ PDFs/XLSX).
- **merge** and **apply** scripts need `data/states/new-jersey.json` to exist and contain counties/towns; for new towns, add them to the JSON and to the source script configs (see main [README.md](./README.md)).
