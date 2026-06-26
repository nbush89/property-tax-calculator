# HB 581 mixed-jurisdiction architecture & next-batch rollout

**Status:** Approved 2026-06-11. Build scheduled for next session.

**Goal:** Add Rockdale, Henry, and Paulding to GA coverage. Refactor HB 581 handling so future GA counties (and other GA edge cases) drop in as pure data entry — no calculator code changes.

---

## Architectural decision

**Build the general per-jurisdiction model**, not pattern-locked branches.

Trade-off considered: pattern-only would have saved ~1 day (4.5 vs 5.5) but locked the calculator to the 3 patterns seen so far (fully out, fully in, schools-only out). The general design absorbs the extra day once and never requires a refactor when a future county shows a new combination (e.g., one city out / another city in within the same county, or independent school district opt-outs in Buford/Bremen/etc.).

---

## Verified opt-out status (the 3 next-batch counties)

| County | County BOC | Schools | Cities | Pattern |
|---|---|---|---|---|
| **Rockdale** | In | In (3-4 vote to opt out failed Feb 27) | Conyers In | **Fully in** — HB 581 applies entire bill |
| **Henry** | In | **Out** (5-0 Feb 10) | McDonough, Hampton, Stockbridge, Locust Grove all In | **Schools out, rest in** |
| **Paulding** | In | **Out** (Feb 11) | Dallas, Hiram In (default — no hearings held) | **Schools out, rest in** |

Sources captured in earlier session transcript. Re-verify Dallas + Hiram by phone before publishing if max confidence wanted; otherwise ship on Paulding gov authoritative claim "no other Paulding taxing jurisdiction has been found advertising opt-out intent."

---

## Data model

Add to existing `MillageBreakdown` type:

```typescript
type MillageBreakdown = {
  year: number
  city?: number
  county?: number
  school?: number
  state?: number
  total: number
  // Per-jurisdiction HB 581 opt-out status. Undefined = treat as opted out
  // (traditional math), matching the pre-refactor behavior so existing
  // metro-4 + Douglas data continues to work without backfill.
  hb581OptOut?: {
    county?: boolean
    school?: boolean
    city?: boolean
    // state portion not affected (state didn't get to opt; GA state millage = 0 since 2016)
  }
  // Reserved annotation for counties with their own pre-existing local
  // floating exemption (Cobb, Gwinnett). Not used by calculator v1; reserves
  // the field so future upgrade doesn't need schema migration.
  hasPreExistingLocalCap?: boolean
  sourceRef: string
}
```

Flags live per-year on the millage entry so 2026 status changes fit naturally as new entries are added.

---

## Calculator math

Per Henry County official guidance: "For the 2025 Digest Year, the base year assessed value is the 2024 Digest Year assessed value for all eligible homesteads." → assume user had homestead in 2024 without asking. For new buyers, cap doesn't bind in year one, math degenerates to traditional. No new user input required.

```typescript
// Pseudocode — actual implementation in utils/calculateTax.ts
function calculateGeorgia(fmv: number, mill: MillageBreakdown, opts: {
  baseYearFMV?: number  // defaults to fmv (new buyer / no cap)
  cpiPct?: number       // defaults to 0.03 (rough CPI placeholder; verify state CPI)
}) {
  const ratio = 0.40
  const homestead = 2000
  const baseFMV = opts.baseYearFMV ?? fmv
  const cpi = opts.cpiPct ?? 0.03

  const traditionalAV = Math.max(0, fmv * ratio - homestead)
  const cappedAV = Math.max(0, baseFMV * ratio * (1 + cpi) - homestead)
  // Cap is a ceiling, not a floor — never produce a value above traditional
  const protectedAV = Math.min(cappedAV, traditionalAV)

  const components = [
    { name: 'county', mills: mill.county ?? 0,  optOut: mill.hb581OptOut?.county ?? true },
    { name: 'school', mills: mill.school ?? 0,  optOut: mill.hb581OptOut?.school ?? true },
    { name: 'city',   mills: mill.city ?? 0,    optOut: mill.hb581OptOut?.city ?? true },
    { name: 'state',  mills: mill.state ?? 0,   optOut: true },
  ]

  const breakdown = components.map(c => {
    const av = c.optOut ? traditionalAV : protectedAV
    const portion = av * c.mills / 1000
    return { ...c, assessedValue: av, portion, isCapped: !c.optOut }
  })
  const total = breakdown.reduce((s, b) => s + b.portion, 0)
  return { total, breakdown }
}
```

Calculator UI: keep single estimate; flag capped components in the breakdown with a small inline note. Disclosure for new buyers: "if you bought this year, the HB 581 cap doesn't reduce your bill yet — your first-year bill matches the traditional calculation. The cap protects against future growth."

---

## HB 581 page changes

Replace the current static per-county lookup with a data-driven status grid:

```
{County} County
  County government: {In | Out}
  School district:   {In | Out}
  Cities:
    {city A}:        {In | Out}
    {city B}:        {In | Out}
```

Read flags directly off each county's millage entry. Any new county supported automatically.

FAQ rewrites:
- Drop "all four metros opted out" framing entirely (no longer accurate as scope grows).
- Replace with "X of the Y GA counties we cover have full opt-outs; Z are mixed; W are fully in. See the lookup table for your county."
- Add FAQ: "What does it mean when only the school district opted out?" → covers Henry/Paulding pattern explicitly.

---

## Build steps (~5.5 days)

| # | Step | Effort | Files touched |
|---|------|--------|---------------|
| 1 | Add `hb581OptOut` + `hasPreExistingLocalCap` to `MillageBreakdown` type; backfill existing metros + Douglas with `hb581OptOut: { county: true, school: true, city: true }` | 0.5d | `lib/data/types.ts`, `data/states/georgia.json` |
| 2 | Refactor `calculatePropertyTaxGeorgia` per pseudocode above; add `isCapped` to breakdown rows | 1d | `utils/calculateTax.ts` |
| 3 | Update `TaxResults` UI to render capped-component inline note | 0.5d | `components/calculator/TaxResults.tsx` or equivalent |
| 4 | Refactor HB 581 page lookup table to be data-driven; FAQ rewrites | 0.5d | `app/[state]/hb-581-opt-out-counties/page.tsx` |
| 5 | Fetch Rockdale/Henry/Paulding millage + ACS data (same OCR + Census pattern as Douglas; pages already rasterized at `/tmp/ga-pages/`) | 1d | `data/states/georgia.json`, `scripts/state-metrics/ga/*` |
| 6 | Hand-write copy: Conyers (Rockdale seat), McDonough (Henry seat), Dallas (Paulding seat) | 0.5d | `data/states/georgia.json` |
| 7 | QA: tsc, render checks for new pages + HB 581 page status grid | 0.5d | — |
| 8 | Verify Dallas + Hiram opt-out status via direct phone if max confidence wanted (skippable) | 0.5d optional | — |

---

## Open questions for next session

1. **CPI value for cap math.** The 0.03 placeholder needs to be sourced from the GA State Revenue Commissioner's official annual rate. As of last check, the 2025 inflation factor was published per HB 581 mechanism. Verify exact figure for 2025 before shipping; consider making it a constant tied to year in case 2026 needs a different value.
2. **Cobb / Gwinnett pre-existing local caps.** v1 treats them as opted-out (traditional math). This understates protection for longtime owners in those counties. Worth disclosing in town copy or a callout. Don't model the actual local cap math in v1.
3. **Dallas and Hiram direct verification.** Whether to invest the half day before publishing.
4. **Status grid component shared with future counties.** Should it live as a generic component (`<JurisdictionOptOutGrid />`) or stay inline on the HB 581 page? Generic if we plan to surface the same grid on county pages.

---

## What this unlocks

After this refactor, adding any future GA county (the Sal-priority counties or any beyond) is purely:
1. Add county stub to `georgia.json` with `neighborCounties` + empty towns
2. Run `scripts/source-state-metrics.ts --state georgia` to pull millage + ACS
3. Hand-fill the `hb581OptOut` flags from verified sources
4. Hand-write top-city copy (1-2 hours per county)
5. Ship

No more calculator code changes per county. No more HB 581 page edits per county.
