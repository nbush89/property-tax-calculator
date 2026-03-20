import type { DataPoint, Unit } from './state-metrics-types'

export function buildSeries(
  yearToValue: Record<number, number | undefined>,
  unit: Unit,
  sourceRef: string,
  maxPoints = 5
): DataPoint[] {
  const years = Object.keys(yearToValue)
    .map(y => Number(y))
    .filter(y => Number.isFinite(y))
    .sort((a, b) => a - b)

  const series: DataPoint[] = []
  for (const year of years) {
    const v = yearToValue[year]
    if (v == null) continue
    series.push({ year, value: v, unit, sourceRef })
  }
  return series.slice(-maxPoints)
}
