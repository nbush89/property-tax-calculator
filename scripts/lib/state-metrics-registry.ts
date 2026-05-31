/** Supported states for source-state-metrics / merge-state-metrics. */

export const STATE_METRICS_SLUGS = ['new-jersey', 'texas', 'georgia'] as const
export type StateMetricsSlug = (typeof STATE_METRICS_SLUGS)[number]

export const STATE_FIPS: Record<StateMetricsSlug, string> = {
  'new-jersey': '34',
  texas: '48',
  georgia: '13',
}

export function isStateMetricsSlug(s: string): s is StateMetricsSlug {
  return (STATE_METRICS_SLUGS as readonly string[]).includes(s)
}
