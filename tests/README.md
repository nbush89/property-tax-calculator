# Tests

Lightweight **Node assert** suites run with **tsx** (no Jest/Vitest).

```bash
npm test
```

This executes `run-all.ts`, which loads:

| File | Focus |
|------|--------|
| `resolveDisplayMetrics.test.ts` | Metric display resolver + capabilities |
| `countyContent.test.ts` | County page content builders |
| `rates-from-state.test.ts` | Rate/year helpers + adapter |

To run a single file:

```bash
npx tsx tests/countyContent.test.ts
```
