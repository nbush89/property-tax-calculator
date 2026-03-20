# Running the Scripts

This doc describes which scripts to run, in what order, and what each one does. All commands assume you're in the project root and have run `npm install`.

---

## Run order (full pipeline)

### New Jersey (recommended: one source + one merge)

| Step | Command | Purpose |
| ---- | ------- | ------- |
| 1 | `source-state-metrics` (NJ, full) | Census ACS median home + GTR effective rates + MOD IV avg tax bills |
| 2 | `merge-state-metrics` (NJ) | Merge payload into `data/states/new-jersey.json` |
| 3 | `apply-town-overviews.ts` | Build standardized `town.overview` from metrics |

Tier-1 town list and PDF overrides live in **`scripts/state-metrics/nj/config.ts`** (`NJ_TIER1`, `PDF_DISTRICT_OVERRIDES`).

```bash
npx tsx scripts/source-state-metrics.ts --state new-jersey --out /tmp/nj-state-metrics.json
npx tsx scripts/merge-state-metrics.ts --state new-jersey /tmp/nj-state-metrics.json
npx tsx scripts/apply-town-overviews.ts
```

Or **ACS + GTR only** (no MOD IV), then merge MOD IV separately:

```bash
npx tsx scripts/source-state-metrics.ts --state new-jersey --skip-modiv --out /tmp/nj-tier1.json
npx tsx scripts/merge-state-metrics.ts --state new-jersey /tmp/nj-tier1.json
npx tsx scripts/source-state-metrics.ts --state new-jersey --only modiv > /tmp/nj-modiv.json
npx tsx scripts/merge-state-metrics.ts --state new-jersey /tmp/nj-modiv.json
npx tsx scripts/apply-town-overviews.ts
```

npm shortcuts: `npm run scrape-town-metrics` / `merge-town-metrics` (tier1-only path), `source-avg-tax-bill` / `merge-avg-tax-bill` (MOD IV only).

### Texas

```bash
npx tsx scripts/source-state-metrics.ts --state texas --out /tmp/texas-metrics.json
npx tsx scripts/merge-state-metrics.ts --state texas /tmp/texas-metrics.json
```

(`npm run source-texas-metrics` / `merge-texas-metrics` write to `/tmp/texas-town-metrics.json`.)

Optional after merges: **`validate-tier1-overviews.ts`**, `validate-state-data.ts`, etc.

---

## Shared vs state-specific code

- **All states:** Census ACS median home value (`scripts/lib/acs-median-home-value.ts`).
- **New Jersey:** GTR PDF + MOD IV (`scripts/state-metrics/nj/gtr.ts`, `modiv.ts`).
- **Texas:** ACS median home + county shell + rates scaffold (`state-metrics/tx/rates.ts`). Payload `towns` keys are **`countySlug/townSlug`**; `counties` mirrors NJ shape. Official rates ref appears in `meta.sourceRefs` only when rate series are merged.

Use **`source-state-metrics`** / **`merge-state-metrics`** (or the `npm run` aliases above).

---

## What each unified entry does

### `source-state-metrics.ts`

- **`--state new-jersey`:** Fetches ACS, NJ GTR PDFs, MOD IV (unless `--skip-modiv`). Writes JSON with `counties` + `towns` keyed by display name.
- **`--state new-jersey --only modiv`:** Legacy MOD IV JSON to **stdout** (for piping to a file).
- **`--state texas`:** ACS for every town in `data/states/texas.json`.

### `merge-state-metrics.ts`

- **`--state new-jersey`:** Merges unified payload, or detects legacy MOD IV-only payload (`counties`/`towns` as flat series).
- **`--state texas`:** Merges town metrics by matching `town.name`.

### `apply-town-overviews.ts`

Builds `town.overview` for every town from merged metrics. Run after merging.

---
