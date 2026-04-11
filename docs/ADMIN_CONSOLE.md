# Admin Console Reference

**Created:** April 8, 2026

This document covers every page under `/admin`, how each one scores and measures content, the rule-sets that drive decisions, and the data files that back all review state. No database is involved — all state is in-memory or flat JSON under `data/admin/`.

---

## Table of contents

1. [Route map and authentication](#1-route-map-and-authentication)
2. [JSON file storage](#2-json-file-storage)
3. [Publish readiness](#3-publish-readiness)
   - [Score model](#31-score-model)
   - [Town validator](#32-town-validator)
   - [County validator](#33-county-validator)
   - [State validator](#34-state-validator)
   - [Decision logic](#35-decision-logic)
   - [Effective publish status and overrides](#36-effective-publish-status-and-overrides)
   - [Console table and filters](#37-console-table-and-filters)
4. [SEO opportunities](#4-seo-opportunities)
   - [Landing-page CSV import](#41-landing-page-csv-import)
   - [CTR opportunity scoring](#42-ctr-opportunity-scoring)
   - [Metadata diagnostics](#43-metadata-diagnostics)
   - [Console table and filters](#44-console-table-and-filters)
5. [SEO recommendations](#5-seo-recommendations)
   - [Query CSV import and override](#51-query-csv-import-and-override)
   - [Aggregation and recommendation strength](#52-aggregation-and-recommendation-strength)
   - [Recommendation engine rules](#53-recommendation-engine-rules)
   - [Console table and filters](#54-console-table-and-filters)
6. [Shared review patterns](#6-shared-review-patterns)
7. [File reference](#7-file-reference)

---

## 1. Route map and authentication

### Route map

| Path | What it does |
|------|--------------|
| `/admin` | Redirects to `/admin/publish-readiness` |
| `/admin/login` | Sign-in form; also auto-bypassed in dev without env vars |
| `/admin/publish-readiness` | SSR: runs all validators, loads overrides → `PublishReadinessConsole` |
| `/admin/seo-opportunities` | SSR: loads snapshots + reviews + publish resolution + metadata audits → `SeoOpportunitiesConsole` |
| `/admin/seo-recommendations` | Client-only: CSV upload triggers server action; no SSR data |

### Authentication

Enforced by `middleware.ts` (matcher: `/admin`, `/admin/:path*`). `/admin/login` itself is always allowed through.

**Dev open mode:** `NODE_ENV === 'development'` **and** both `ADMIN_PUBLISH_PASSWORD` **and** `ADMIN_PUBLISH_TOKEN` are unset → all admin routes are open; login page shows a "Continue to admin" button instead of a password form.

**Production flow:**
1. Middleware reads cookie `admin_session`.
2. If value doesn't match `ADMIN_PUBLISH_TOKEN` → redirect to `/admin/login?from=<pathname>`.
3. Login `POST` (`app/admin/login/actions.ts`) compares `password` from form against `ADMIN_PUBLISH_PASSWORD`. On match, sets `admin_session` as an `httpOnly`, `sameSite: lax`, `secure` (in prod) cookie with `maxAge: 60 * 60 * 24 * 7` (7 days).
4. Server actions also call `assertAdminSession` (`lib/admin/assertAdminSession.ts`) before writing state — so mutable endpoints are double-checked.

---

## 2. JSON file storage

All persistent admin state lives in flat JSON files under `data/admin/`. The directory is created automatically if it doesn't exist.

| Purpose | File | Shape |
|---------|------|-------|
| Editorial publish overrides | `data/admin/publish-overrides.json` | `{ overrides: PublishOverrideRecord[] }` |
| Search Console landing-page snapshots | `data/admin/search-performance-snapshots.json` | `{ snapshots: SearchPerformanceSnapshotRecord[] }` |
| CTR/SEO optimization reviews | `data/admin/seo-optimization-reviews.json` | `{ reviews: SeoOptimizationReviewRecord[] }` |
| SEO recommendations review map | `data/admin/seo-recommendations.json` | `{ version: 1, byPath: Record<path, ReviewEntry> }` |

**ID formats:**
- Publish overrides: `ov_<uuid>`
- Snapshots: `sp_<uuid>`
- SEO reviews: `seo_<uuid>`

---

## 3. Publish readiness

Every entity — state, county, or published town — is run through a **validator** that produces a numeric **score** (0–100) plus an array of typed **issues**. A **decision** is derived from score + issues. An editorial **override** can force a different effective status. The SSR page (`buildPublishReviewRows`) merges all of this into a flat table.

### 3.1 Score model

Scores are additive. Each section that is "complete" contributes a fixed weight. Sections are checked independently — there is no penalty for missing optional sections, only no credit.

Final score is capped at **100** (weights already total ≤ 100).

### 3.2 Town validator

**Source:** `lib/publishReadiness/validateTownPublishReadiness.ts`

#### Score weights

| Section | Points | Condition |
|---------|--------|-----------|
| `entity` | 20 | Entity exists and resolves (always — this is earned by having a town page at all) |
| `snapshot` | 20 | Overview resolved **and** primary metric snapshot passes |
| `calculator` | 15 | `canCalculateForState(stateSlug)` is true |
| `faq` | 10 or 5 | `faqs.length >= 4` → 10; else 5 |
| `methodology` | 10 | Always `true` for town pages |
| `comparison` | 10 | Comparison items resolved in content |
| `trend` | 5 | Trend series has ≥ 3 points |
| `related` | 5 | At least one related town |
| `estimateGuide` | 5 | Estimate guide steps resolved |

**Maximum:** 100 points.

#### Hard hold conditions (score is irrelevant, decision is always `hold`)

- State data not found
- Town entity not resolved (slug/routing mismatch)
- Overview is null
- Primary metric snapshot fails (`!snapshotOk`)
- State calculator not supported

#### Key issue codes

| Code | Severity | Meaning |
|------|----------|---------|
| `STATE_NOT_RESOLVED` | error | State data file missing or slug unrecognised |
| `TOWN_NOT_RESOLVED` | error | Town not found in county data |
| `UNSUPPORTED_METRIC_RENDERED` | error | A metric the state doesn't support is displayed on the page |
| `SNAPSHOT_MISSING` | warning | No primary metric value at all |
| `PRIMARY_METRIC_MISSING` | warning | Primary metric key unresolved |
| `FALLBACK_SNAPSHOT_USED` | warning | Using county-level data instead of town |
| `COUNTY_FALLBACK_USED` | info | Trend series is county-level (not town) |
| `FALLBACK_TREND_USED` | info | Trend uses fallback source |
| `TREND_UNAVAILABLE` | info | Fewer than 3 trend points |
| `CALCULATOR_MISSING` | info | Calculator not supported for this state |
| `FAQ_TOO_SHORT` | info | Fewer than 4 FAQ items |
| `SOURCE_REF_MISSING` | warning | Primary metric datapoint has no `sourceRef` |
| `COMPARISON_UNAVAILABLE` | info | No comparison items resolved |
| `RELATED_PLACES_EMPTY` | info | No related towns (max 6 looked up) |
| `PAGE_TOO_THIN` | warning | Content sections below threshold |
| `TOO_FEW_SUBSTANTIVE_SECTIONS` | warning | Not enough content-heavy sections |

#### Strong page (quality tier above "publish")

All conditions must pass:
- `decision === 'publish'`
- No `error` or `warning` issues
- `score >= 92`
- `!metrics.fallbackUsed`
- `!metrics.trendCountyContext`
- `metrics.primaryMetricResolved === true`
- `metrics.townLevelPrimary === true`

### 3.3 County validator

**Source:** `lib/publishReadiness/validateCountyPublishReadiness.ts`

#### Score weights

| Section | Points | Condition |
|---------|--------|-----------|
| `entity` | 20 | Always |
| `snapshot` | 15 | County hero metric resolves and renders |
| `calculator` | 10 | `canCalculateForState` |
| `directory` | 10 or 3 | `townDirectoryVisible` → 10; else 3 |
| `faq` | 10 or 5 | ≥ 4 items → 10; else 5 |
| `methodology` | 10 | Always |
| `overview` | 5 | Overview paragraphs present |
| `comparison` | 10 | Comparison content truthy |
| `trend` | 5 | State supports trend + county series + YoY resolves |
| `taxFactors` | 5 | Tax factor bullets resolved |

**Hard hold:** State missing, county not found, county hero metric absent, calculator unsupported.

#### Strong page

All must pass:
- `decision === 'publish'`
- No `error` or `warning` issues
- `score >= 92`
- `metrics.primaryMetricResolved && metrics.sourceRefPresent`
- `publishedTownCount > 0`
- No `DIRECTORY_EMPTY` or `RELATED_PLACES_EMPTY` issues

### 3.4 State validator

**Source:** `lib/publishReadiness/validateStatePublishReadiness.ts`

#### Score weights

| Section | Points | Condition |
|---------|--------|-----------|
| `entity` | 20 | Always |
| `overview` | 15 | State entity resolves (always true when state exists) |
| `calculator` | 10 | `canCalculateForState` |
| `directory` | 15 | At least one county present |
| `faq` | 10 or 4 | ≥ 4 items → 10; else 4 |
| `methodology` | 3 | Always added |
| `comparison` | 10, 5, or 0 | `countyCardsWithMetric >= 2` → 10; `=== 1` → 5; else 0 |
| `rankingsTrend` | up to 10 | +5 if featured towns exist; +5 if rates nav available (always true) |

**Hard hold:** State missing, no counties, calculator unsupported.

**Always-added informational issues:** `FAQ_MISSING`, `METHODOLOGY_MISSING` (severity: info).

**Strong page:**
- `decision === 'publish'`
- No `error` or `warning` issues
- `score >= 92`
- `sections.directory === true`

### 3.5 Decision logic

**Source:** `lib/publishReadiness/decide.ts`

Thresholds: `PUBLISH_MIN = 90`, `WARN_MIN = 75`.

```
decisionFromScoreAndIssues(score, issues, hardHold):
  if hardHold                        → "hold"
  if any issue.severity === "error"  → "hold"
  if score >= 90                     → "publish"
  if score >= 75                     → "publish_with_warnings"
  else                               → "hold"
```

### 3.6 Effective publish status and overrides

**Source:** `lib/publishReadiness/effectivePublishStatus.ts`, `lib/admin/effectivePublishForEntity.ts`

An editorial override (`data/admin/publish-overrides.json`) can be set to `use_validator`, `publish`, `hold`, or `review`.

| Override status | Effective status | `manualOverrideActive` |
|-----------------|-----------------|----------------------|
| `use_validator` | = validator decision | `false` |
| `publish` | `'publish'` | `true` |
| `hold` | `'hold'` | `true` |
| `review` | `'review'` | `true` |

`isEffectivelyPublished`: `true` only for `'publish'` and `'publish_with_warnings'`. `'review'` and `'hold'` are **not** effectively published.

Override keys are `entityType:stateSlug:countySlug:townSlug` (lowercase; empty strings for missing levels).

### 3.7 Console table and filters

**Component:** `components/admin/PublishReadinessConsole.tsx`

#### Summary cards

- Total rows
- Effective: publish / publish+warn / hold / review counts
- Manual overrides active

#### Table columns

| Column | Source |
|--------|--------|
| Entity | `entityLabel` |
| Type | `entityType` |
| State | `stateSlug` |
| County | `countySlug` |
| Score | `score` (0–100) |
| Validator | `validatorDecision` badge |
| Effective | `effectiveStatus` badge (+ "override" chip if active) |
| W | `warningsCount` |
| E | `errorsCount` |
| Fallback | `metrics.fallbackUsed` boolean |
| Primary | `primaryMetricKey` |
| Trend | `trendMetricKey` |
| Updated | `updatedAt` (from override, YYYY-MM-DD) |
| Actions | Opens detail drawer |

#### Detail drawer

Shows all validator issues grouped by severity. Issue chips for high-visibility codes (`publishIssueConfig.ts`): `UNSUPPORTED_METRIC_RENDERED`, `SNAPSHOT_MISSING`, `PAGE_TOO_THIN`, `TOO_FEW_SUBSTANTIVE_SECTIONS`, `TOWN_LEVEL_PRECISION_UNSUPPORTED`, `METHODOLOGY_MISSING`, `FAQ_TOO_SHORT`, `TREND_UNAVAILABLE`, `FALLBACK_SNAPSHOT_USED`, `FALLBACK_TREND_USED`, `PRIMARY_METRIC_MISSING`, `CALCULATOR_MISSING`.

Override form: select `use_validator | publish | hold | review` + freetext notes.

#### Filters

- Entity type: all / town / county / state
- State (dropdown of present slugs)
- County (dropdown)
- Effective status
- Validator decision
- Checkbox: has warnings / has errors / fallback primary / manual override
- Sort: warnings desc, score asc, label A–Z
- Text search (label + slugs)
- Revalidate button (re-runs validators server-side)

---

## 4. SEO opportunities

Tracks **page-level Search Console performance** (impressions, clicks, CTR, position) against each entity's **live metadata**. Separate from publish readiness.

### 4.1 Landing-page CSV import

**Source:** `lib/seo/importSearchConsoleCsv.ts`

Expected columns (flexible header matching): `Top pages` / `Page` / `URL` for the URL column; `Clicks`, `Impressions`, `CTR`, `Position`. Query column in this CSV is silently ignored.

- Rows with any null metric, missing URL, or invalid path → `invalidSamples` (not stored).
- URLs normalized via `normalizeSitePath`: strip origin, lowercase, no trailing slash.
- Only paths that resolve to a known entity via `pathToEntity` are stored.
- **Dedup rule:** last row for a given normalized path wins (within one upload).
- **Import modes:** `append` (adds/updates by path) or `replace_all` (clears everything first).

Stored in `data/admin/search-performance-snapshots.json`. When loading the SEO opportunities page, the **latest snapshot by path** is used (snapshots sorted by `importedAt`, last one per `pagePath.toLowerCase()`).

### 4.2 CTR opportunity scoring

**Source:** `lib/seo/ctrOpportunity.ts`

Inputs per snapshot row: `impressions`, `ctr` (0–1 fraction), `averagePosition`, `entityType`, `effectivelyPublished`.

#### Opportunity level and base score

| Level | Condition | Base score formula |
|-------|-----------|-------------------|
| **high** | `impressions >= 100 && ctr < 0.02 && averagePosition <= 20` | `100 + min(impressions/10, 80) + max(0, 20 - averagePosition)` |
| **medium** | `impressions >= 50 && ctr < 0.03 && averagePosition <= 30` | `60 + min(impressions/15, 40) + max(0, 15 - averagePosition/2)` |
| **low** | `impressions >= 20 && ctr < 0.04` | `25 + impressions/20` |
| **low** | `impressions >= 10 && ctr < 0.05` | `15` |
| **none** | `impressions < 10` | `0` |
| **none** | anything else (healthy or deep) | `min(10, impressions/50)` |

#### Modifiers

- `entityType === 'town'` → `baseScore += 5` (reason appended to `opportunityReasons`)
- `effectivelyPublished === false` → `baseScore *= 0.35` (reason appended; deprioritises unpublished pages)

#### Final score

`priorityScore = Math.round(baseScore * 10) / 10`

### 4.3 Metadata diagnostics

**Source:** `lib/seo/metadataDiagnostics.ts`

`auditMetadataPresentation` runs against the **resolved live presentation** (title, description, H1) from `resolveEntityPresentation` — the same text that would appear in the browser.

**Length constants:** `TITLE_SHORT = 25`, `TITLE_LONG = 65`, `DESC_SHORT = 70`, `DESC_LONG = 165`.

| Code | Severity | Trigger |
|------|----------|---------|
| `TITLE_MISSING` | error | Title is empty |
| `TITLE_SHORT` | warning | Title length < 25 characters |
| `TITLE_LONG` | warning | Title length > 65 characters |
| `TITLE_LOCALITY_WEAK` | warning | Title doesn't contain state name, abbreviation, county name, or town name |
| `TITLE_INTENT_WEAK` | info | Non-state entity; title lacks "calculator", "estimate", or rates hint |
| `TITLE_YEAR` | info | `expectYearInTitle` is set but no `20xx` year found |
| `META_DESC_MISSING` | error | Description is empty |
| `META_DESC_SHORT` | warning | Description length < 70 characters |
| `META_DESC_LONG` | info | Description length > 165 characters |
| `META_LOCALITY_WEAK` | warning | Description doesn't contain locality name |
| `META_ACTION_WEAK` | info | Description lacks "calculat", "estimate", "rate", or "explore" |
| `H1_TITLE_DRIFT` | info | H1 is present but title doesn't start with the same first 12 chars (case-insensitive) |
| `PRESENTATION_UNRESOLVED` | warning | `resolveEntityPresentation` returned null for this path |

`summarizeDiagnostics` produces a short string like `"2 warn/error +1 info"` or `"OK"` used in the table column.

`expectYearInTitle` is `true` for town and county entities; `false` for state hubs.

### 4.4 Console table and filters

**Component:** `components/admin/SeoOpportunitiesConsole.tsx`

#### Summary cards

- Snapshot paths (total)
- High opportunity count
- With meta flags count
- Filtered view count

#### Table columns

| Column | Source |
|--------|--------|
| Entity | `entityLabel` |
| Type | `entityType` |
| State | `stateSlug` |
| County | `countySlug` |
| Impr. | `impressions` |
| Clicks | `clicks` |
| CTR | `ctr * 100` as % |
| Pos | `averagePosition` |
| Opp | `opportunityLevel` badge (high/medium/low/none) |
| Pri | `priorityScore` |
| Publish | `effectiveStatus` badge |
| Review | `reviewStatus` badge (open / in_progress / optimized / ignore) |
| Meta | `metadataSummary` string |
| Updated | `importedAt` date (YYYY-MM-DD) |

Default table view shows **only published pages** (`effectivePublished === true`).

#### Detail drawer

- Metrics grid (impressions, clicks, CTR, position)
- Opportunity badge + score + reason bullets
- Effective publish and validator decision badges
- Snippet preview (title, path, description from resolved presentation)
- H1 preview
- Full list of metadata diagnostic issues with code, severity, message, and recommendation
- Snapshot import timestamp and SC date range (if set)
- CTR review form: status (open / in_progress / optimized / ignore) + notes

#### Filters

- Entity type: all / state / county / town
- State dropdown (populated from snapshot data)
- County dropdown
- Opportunity level: all / high / medium / low / none
- Review status: all / open / in_progress / optimized / ignore
- Publish: all / published only (default) / not published
- Low CTR only: `ctr < 0.03 && impressions >= 50`
- Metadata issues only: `metadataIssueCount > 0`
- Impressions minimum (free-text integer)
- Sort: priority desc (default), impressions desc, CTR asc, position asc/desc, last reviewed desc
- Text search (entity label, path, state, county slugs)
- Import CSV form (file + mode)

---

## 5. SEO recommendations

Separate from SEO opportunities. Processes **per-query** Search Console data (query + page per row) rather than page-level snapshots, and generates **suggested title/meta changes** per page with rationale.

Everything is **in-memory per upload**; review status is saved to `data/admin/seo-recommendations.json`.

### 5.1 Query CSV import and override

**Source:** `lib/seo/importSearchConsoleQueries.ts`

**Two supported export modes:**

| Mode | When | How |
|------|------|-----|
| **A — page column present** | Multi-page Queries export | Each row's own page URL is used; row wins over any override |
| **B — no page column** | Single-page filtered export | `pagePathOverride` (from UI) required; applied to all rows |

Required columns: `Query` (or Top queries), `Clicks`, `Impressions`, `CTR`, `Position`. `Page` (or `URL` / `Top pages` / `Landing page`) is optional when an override is supplied.

**Precedence:** row-level page always wins; `pagePathOverride` fills in only when no page column exists.

**Override validation:** `normalizeSitePath` then `pathToEntity` — if the override path doesn't resolve to a known entity, the import fails with a specific error (not a generic "invalid CSV").

**Import summary fields:** `totalRows`, `validRows`, `invalidRows`, `usedPageOverride`, `pageOverride?`, `ignoredPagePathOverride?`, `matchedRows`, `unmatchedRows`.

### 5.2 Aggregation and recommendation strength

**Source:** `lib/seo/aggregateQueryPerformance.ts`, `lib/seo/generateSeoRecommendation.ts`

After parsing, rows are **grouped by normalized page path**. For each page:

- `impressions` = sum of all query impressions
- `clicks` = sum of all query clicks
- `ctr` = total clicks / total impressions
- `avgPosition` = impression-weighted average (`sum(position * impressions) / total impressions`)
- `topQueries` = up to 8 queries sorted by impressions desc

#### Recommendation strength (separate thresholds from CTR opportunity)

| Strength | Condition |
|----------|-----------|
| **high** | `impressions >= 100 && ctr < 0.025 && avgPosition <= 20` |
| **medium** | `impressions >= 50 && ctr < 0.04` |
| **low** | `impressions >= 20` |
| **none** | otherwise |

Note: The CTR cutoff for **high** here is **2.5%**, vs **2.0%** in the CTR opportunity system. The two systems are independent.

### 5.3 Recommendation engine rules

**Source:** `lib/seo/generateSeoRecommendation.ts`

For each page, the engine:

1. Resolves **current** title and description via `loadPageMetadata` (wraps `resolveEntityPresentation`) — the same text production routes serve.
2. Runs **`auditMetadataPresentation`** (same diagnostics as SEO opportunities) to build `detectedIssues`.
3. Builds a **suggested title** and **suggested description** via deterministic rules.

#### Town pages

- Baseline from **`generateTownSeoTitle`** / **`generateTownSeoDescription`** + **`buildTownSeoFields`** (tier + year from actual data — not invented).
- **Query signal — "rate":** if top query mentions "rate" and title lacks a rates variant → append `| Rates`.
- **Query signal — "calculator":** if top query mentions "calculator" and title lacks it → reinforce wording or append `| Calculator`.
- **State abbreviation check:** if abbreviation missing from title → prepend `{ABBREV} — {title}`.
- **Year check:** if no `20xx` year in title → append `({year})`.
- Meta is extended with a stronger CTA if it is short (< 100 chars) or lacks action verbs.

#### Non-town pages (state / county)

- Start from `resolveEntityPresentation` copy.
- Apply the same abbreviation and year rules.
- If meta is missing, short (< 80 chars), or has `META_ACTION_WEAK` / `META_LOCALITY_WEAK` diagnostics → replace with a state-level planning template.
- Query signals ("rate" or "calculator") extend the meta with a matching phrase.

#### Rationale strings

Every decision that changes the suggestion adds an entry to `rationale[]`. The drawer shows these as a bullet list so the reasoning is auditable without reading code.

The "high opportunity" note (`impressions >= 100, CTR < 2.5%, avg position <= 20`) is always prepended to rationale when strength is `high`.

### 5.4 Console table and filters

**Component:** `components/admin/SeoRecommendationsConsole.tsx`

#### Summary cards

- Pages matched (all loaded rows)
- High strength count
- Filtered view count
- Approved reviews count

#### Table columns

| Column | Source |
|--------|--------|
| Page | `pagePath` |
| Entity | `entityLabel` + `entityType` |
| Impr. | `impressions` |
| CTR | `ctr * 100` % |
| Pos | `avgPosition` |
| Top query | `primaryQuery` (query from top entry by impressions) |
| Strength | `strength` badge |
| Current title | `currentTitle` |
| Suggested title | `suggestedTitle` |
| Review | `reviewStatus` badge |
| Actions | "Details" → opens detail drawer |

#### Detail drawer

- Metrics grid (impressions, clicks, CTR, avg position)
- Strength badge
- Top queries list (up to 8, with impressions per query)
- Current title + description
- Suggested title (highlighted) + suggested description
- Rationale bullets (why each change was made)
- Detected issues list (from metadata audit)
- Review form: status (open / approved / ignored) + notes
  - Saves to `data/admin/seo-recommendations.json` — **does not** apply changes to routes or metadata

#### Filters

- Entity type: all / state / county / town
- State dropdown
- Review status: all / open / approved / ignored
- High opportunity only (`strength === 'high'`)
- Low CTR (`ctr < 0.025 && impressions >= 20`)
- Text search (path, entity label, primary query, current title)
- Sort: impressions descending (fixed)

---

## 6. Shared review patterns

The three review stores use slightly different status vocabularies:

| Store | Statuses |
|-------|---------|
| Publish overrides | `use_validator`, `publish`, `hold`, `review` |
| SEO optimization reviews (CTR workflow) | `open`, `in_progress`, `optimized`, `ignore` |
| SEO recommendations | `open`, `approved`, `ignored` |

None of the review state in any store **automatically applies** changes — all suggestions and overrides are editorial records only.

The SEO recommendations store is keyed by lowercase normalized path (no trailing slash). The publish overrides store is keyed by `entityType:stateSlug:countySlug:townSlug`.

---

## 7. File reference

| Area | Path |
|------|------|
| Auth flow | `app/admin/login/page.tsx`, `app/admin/login/actions.ts`, `middleware.ts`, `lib/admin/assertAdminSession.ts` |
| Publish readiness page | `app/admin/publish-readiness/page.tsx`, `app/admin/publish-readiness/actions.ts` |
| Publish readiness console | `components/admin/PublishReadinessConsole.tsx` |
| Publish validators | `lib/publishReadiness/validateTownPublishReadiness.ts`, `validateCountyPublishReadiness.ts`, `validateStatePublishReadiness.ts` |
| Decision + scoring | `lib/publishReadiness/decide.ts` |
| Types | `lib/publishReadiness/types.ts` |
| Effective publish | `lib/publishReadiness/effectivePublishStatus.ts`, `lib/admin/effectivePublishForEntity.ts` |
| Publish overrides store | `lib/admin/publishOverrideStore.ts`, `lib/admin/publishOverrideTypes.ts` |
| Build review rows | `lib/admin/buildPublishReviewRows.ts` |
| High-visibility issue config | `components/admin/publishIssueConfig.ts` |
| SEO opportunities page | `app/admin/seo-opportunities/page.tsx`, `app/admin/seo-opportunities/actions.ts` |
| SEO opportunities console | `components/admin/SeoOpportunitiesConsole.tsx` |
| Landing-page CSV import | `lib/seo/importSearchConsoleCsv.ts` |
| Snapshot store | `lib/seo/searchPerformanceStore.ts` |
| CTR opportunity scoring | `lib/seo/ctrOpportunity.ts` |
| Metadata diagnostics | `lib/seo/metadataDiagnostics.ts` |
| Load opportunity rows | `lib/seo/loadSeoOpportunities.ts` |
| SEO optimization review store | `lib/seo/seoReviewStore.ts` |
| SEO recommendations page | `app/admin/seo-recommendations/page.tsx`, `app/admin/seo-recommendations/actions.ts` |
| SEO recommendations console | `components/admin/SeoRecommendationsConsole.tsx` |
| Query CSV import | `lib/seo/importSearchConsoleQueries.ts` |
| CSV core helpers | `lib/seo/searchConsoleCsvCore.ts` |
| Query aggregation | `lib/seo/aggregateQueryPerformance.ts` |
| Metadata loader | `lib/seo/loadPageMetadata.ts` |
| Recommendation engine | `lib/seo/generateSeoRecommendation.ts` |
| Row builder (end-to-end) | `lib/seo/buildSeoRecommendationRows.ts` |
| Recommendations review store | `lib/seo/seoRecommendationsReviewStore.ts` |
| Entity presentation (live copy) | `lib/seo/entityPresentation.ts` |
| Path → entity | `lib/seo/pathToEntity.ts` |
