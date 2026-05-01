'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { geoMercator, geoPath as d3GeoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'

export interface CountyRateData {
  /** County name as stored in our data (e.g. "Bergen", "Harris") */
  name: string
  slug: string
  effectiveRatePct: number | null
  avgBill: number | null
}

interface Props {
  stateSlug: string
  counties: CountyRateData[]
  /**
   * Slug of the county to highlight (e.g. on a county page).
   * That county is drawn with a stronger stroke; others are de-emphasised.
   */
  highlightSlug?: string
  /** SVG height in pixels. Default 420. */
  height?: number
  /** Show rate legend below map. Default true. */
  showLegend?: boolean
}

// ─── Projection configs ───────────────────────────────────────────────────────

const PROJECTION_CONFIGS: Record<
  string,
  { center: [number, number]; scale: number }
> = {
  'new-jersey': { center: [-74.5, 40.15], scale: 9500 },
  texas: { center: [-99.3, 31.2], scale: 2100 },
}

// ─── Color scale ──────────────────────────────────────────────────────────────

type RGB = [number, number, number]
// Low rate = soft green; high rate = warm amber
const COLOR_LOW: RGB = [187, 222, 182]
const COLOR_HIGH: RGB = [214, 100, 44]

function lerpColor([r1, g1, b1]: RGB, [r2, g2, b2]: RGB, t: number): string {
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`
}

function rateToColor(rate: number, min: number, max: number): string {
  const t = max > min ? Math.max(0, Math.min(1, (rate - min) / (max - min))) : 0
  return lerpColor(COLOR_LOW, COLOR_HIGH, t)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normaliseCountyName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+county$/i, '')
    .replace(/\s+parish$/i, '')
    .trim()
}

interface TooltipState {
  name: string
  rate: number | null
  bill: number | null
  x: number
  y: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChoroplethMap({
  stateSlug,
  counties,
  highlightSlug,
  height = 420,
  showLegend = true,
}: Props) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)
  const [paths, setPaths] = useState<
    { d: string; slug: string; name: string; rate: number | null; bill: number | null }[]
  >([])
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const byName = new Map<string, CountyRateData>()
  for (const c of counties) byName.set(normaliseCountyName(c.name), c)

  const rates = counties.map(c => c.effectiveRatePct).filter((v): v is number => v != null)
  const minRate = rates.length ? Math.min(...rates) : 0
  const maxRate = rates.length ? Math.max(...rates) : 1

  const inHighlightMode = !!highlightSlug

  // Fixed SVG canvas size — we scale internally via viewBox
  const W = 600
  const H = height

  useEffect(() => {
    const geoPath = `/geo/${stateSlug}-counties.json`
    fetch(geoPath)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((geojson: { type: string; features: any[] }) => {
        const projConfig = PROJECTION_CONFIGS[stateSlug] ?? {
          center: [0, 0] as [number, number],
          scale: 1000,
        }

        const projection = geoMercator()
          .center(projConfig.center)
          .scale(projConfig.scale)
          .translate([W / 2, H / 2])

        const pathGen = d3GeoPath(projection)

        const computed = geojson.features
          .map((feature: any) => {
            const geoName = normaliseCountyName(
              feature.properties?.NAMELSAD ?? feature.properties?.NAME ?? ''
            )
            const data = byName.get(geoName)
            const d = pathGen(feature as GeoPermissibleObjects) ?? ''
            return {
              d,
              slug: data?.slug ?? geoName,
              name: data?.name ?? feature.properties?.NAME ?? geoName,
              rate: data?.effectiveRatePct ?? null,
              bill: data?.avgBill ?? null,
            }
          })
          .filter(p => p.d)

        setPaths(computed)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateSlug])

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-surface text-sm text-text-muted"
        style={{ height }}
      >
        Map unavailable — run{' '}
        <code className="mx-1 rounded bg-bg px-1 py-0.5 text-xs">
          node scripts/fetch-geo.mjs
        </code>{' '}
        to download county boundaries.
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-surface text-sm text-text-muted animate-pulse"
        style={{ height }}
      >
        Loading map…
      </div>
    )
  }

  return (
    <div className="relative select-none">
      {/* SVG map */}
      <div className="rounded-lg overflow-hidden border border-border bg-surface">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height }}
          aria-label={`${stateSlug.replace(/-/g, ' ')} county property tax rates map`}
        >
          {paths.map(({ d, slug, name, rate, bill }) => {
            const isHighlighted = slug === highlightSlug
            const isOther = inHighlightMode && !isHighlighted
            const fill =
              rate != null ? rateToColor(rate, minRate, maxRate) : '#e5e7eb'

            return (
              <path
                key={slug}
                d={d}
                fill={isOther ? '#e5e7eb' : fill}
                stroke={isHighlighted ? '#0f172a' : '#ffffff'}
                strokeWidth={isHighlighted ? 2 : 0.5}
                opacity={isOther ? 0.4 : 1}
                className="transition-opacity"
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  router.push(`/${stateSlug}/${slug}-county-property-tax`)
                }
                onMouseEnter={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  setTooltip({
                    name,
                    rate,
                    bill,
                    x: e.clientX - (rect?.left ?? 0),
                    y: e.clientY - (rect?.top ?? 0),
                  })
                }}
                onMouseMove={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  setTooltip(t =>
                    t
                      ? {
                          ...t,
                          x: e.clientX - (rect?.left ?? 0),
                          y: e.clientY - (rect?.top ?? 0),
                        }
                      : t
                  )
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <title>{name} County</title>
              </path>
            )
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-surface px-3 py-2 shadow-lg text-sm"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <p className="font-semibold text-text">{tooltip.name} County</p>
          <p className="text-text-muted">
            Rate:{' '}
            <span className="font-medium text-text">
              {tooltip.rate != null ? `${tooltip.rate.toFixed(2)}%` : 'N/A'}
            </span>
          </p>
          {tooltip.bill != null && (
            <p className="text-text-muted">
              Avg bill:{' '}
              <span className="font-medium text-text">
                ${Math.round(tooltip.bill).toLocaleString('en-US')}
              </span>
            </p>
          )}
          <p className="mt-1 text-xs text-primary">Click to view county →</p>
        </div>
      )}

      {/* Legend */}
      {showLegend && rates.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
          <span className="whitespace-nowrap">{minRate.toFixed(2)}%</span>
          <div
            className="flex-1 h-2 rounded-full"
            style={{
              background: `linear-gradient(to right, ${lerpColor(COLOR_LOW, COLOR_HIGH, 0)}, ${lerpColor(COLOR_LOW, COLOR_HIGH, 1)})`,
            }}
          />
          <span className="whitespace-nowrap">{maxRate.toFixed(2)}%</span>
          <span className="ml-1">effective rate</span>
        </div>
      )}
      <p className="mt-1.5 text-xs text-text-muted">
        Planning estimates only. Click a county to explore rates and trends.
      </p>
    </div>
  )
}
