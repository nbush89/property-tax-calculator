# Capability-driven metrics (display layer)

## Layers

1. **`metricKeys.ts`** — `MetricKey` union (type-only; imported by catalog and capabilities).
2. **`metricCatalog.ts`** — labels, format, priority, `defaultComparable`, optional `useOnCountyCard` / `useOnCountyHero`.
3. **`stateMetricCapabilities.ts`** — Per state: which metrics are supported at `state` / `county` / `town`, plus `semantics`, `comparability`, `note`, `sourceRef`. Includes **calculator** flags (`hasCountyAndMunicipalRates`, `hasComptrollerUnitRates`, `hasTownPages`); `hasAverageTaxBill` is derived from metric rows.
4. **Data JSON** — `entity.metrics.*` time series (unchanged contract in `lib/data/types.ts`).
5. **`resolveDisplayMetrics.ts`** — Merges catalog + capabilities + payload; `getCountyCardHighlight`, `getCountyHeroHighlight`, `buildTownMetricPayload`, `shouldShowCountyAverageTaxBillTrend`, `canCompareMetricAcrossStates`.

`lib/state-capabilities.ts` reads calculator + `stateSupportsAverageTaxBill` from this registry (no duplicate state slug conditionals in consuming components).

## Fallbacks

- **Unknown state** (not in `STATE_METRICS_REGISTRY`): resolver shows any metric **with data**, with neutral `semantics: standard`, `comparability: medium`, unless a future partial row sets `supported: false`.
- **`isMetricDisplayAllowed`**: `null` capability → allow; explicit `supported: false` → hide.

## Tests

Metric resolver coverage lives in `tests/resolveDisplayMetrics.test.ts`. Run everything:

```bash
npm test
```

## Follow-ups

- Wire comparison UIs to `canCompareMetricAcrossStates` when multi-state compare ships.
- Optional: county-level `medianHomeValue` for TX when ACS geography is populated consistently.
