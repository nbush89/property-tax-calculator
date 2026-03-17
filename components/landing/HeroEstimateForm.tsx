'use client'

import { useState } from 'react'
import Select from '@/components/ui/Select'
import { LinkButton } from '@/components/ui/Button'
import { trackEvent } from '@/lib/analytics'
import { buildCalculatorHref } from '@/lib/links/hero'
import type { StateOptionForHero } from '@/lib/geo'

type HeroEstimateFormProps = {
  states: StateOptionForHero[]
}

export default function HeroEstimateForm({ states }: HeroEstimateFormProps) {
  const [stateSlug, setStateSlug] = useState('')
  const [countySlug, setCountySlug] = useState('')
  const [townSlug, setTownSlug] = useState('')
  const [homeValue, setHomeValue] = useState('')

  const selectedState = states.find(s => s.slug === stateSlug)
  const selectedCounty = selectedState?.counties.find(c => c.slug === countySlug)
  const counties = selectedState?.counties ?? []
  const towns = selectedCounty?.towns ?? []

  const ctaHref = buildCalculatorHref({
    stateSlug: stateSlug || '',
    countySlug: countySlug || undefined,
    townSlug: townSlug || undefined,
    homeValue: homeValue.trim() || undefined,
  })

  const handleStateChange = (value: string) => {
    setStateSlug(value)
    setCountySlug('')
    setTownSlug('')
    if (value) {
      trackEvent('select_state', { state: value })
    }
  }

  const handleCountyChange = (value: string) => {
    setCountySlug(value)
    setTownSlug('')
    if (value && stateSlug) {
      trackEvent('select_county', { state: stateSlug, county: value })
    }
  }

  const handleTownChange = (value: string) => {
    setTownSlug(value)
    if (value && stateSlug && countySlug) {
      trackEvent('select_town', { state: stateSlug, county: countySlug, town: value })
    }
  }

  const handleCtaClick = () => {
    trackEvent('cta_calculate_click', {
      page_type: 'hero' as const,
      ...(stateSlug && { state: stateSlug }),
      ...(countySlug && { county: countySlug }),
      ...(townSlug && { town: townSlug }),
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-text">Estimate Preview</h3>

        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">State</label>
            <Select
              value={stateSlug}
              onChange={e => handleStateChange(e.target.value)}
              aria-label="Select state"
            >
              <option value="">Select state...</option>
              {states.map(s => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">County</label>
            <Select
              value={countySlug}
              onChange={e => handleCountyChange(e.target.value)}
              disabled={!stateSlug || counties.length === 0}
              aria-label="Select county"
            >
              <option value="">
                {!stateSlug
                  ? 'Select state first'
                  : counties.length === 0
                    ? 'No counties'
                    : 'Select county...'}
              </option>
              {counties.map(c => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">Town</label>
            <Select
              value={townSlug}
              onChange={e => handleTownChange(e.target.value)}
              disabled={!countySlug || towns.length === 0}
              aria-label="Select town"
            >
              <option value="">
                {!countySlug
                  ? 'Select county first'
                  : towns.length === 0
                    ? 'No towns'
                    : 'Select town (optional)...'}
              </option>
              {towns.map(t => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">Home value</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter home value..."
              value={homeValue}
              onChange={e => setHomeValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
              aria-label="Home value"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <LinkButton
            href={ctaHref}
            variant="primary"
            size="lg"
            className="w-full justify-center"
            onClick={handleCtaClick}
          >
            {stateSlug ? 'Go to calculator' : 'Start calculator'}
          </LinkButton>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium text-text-muted">
            Trends available where data exists
          </p>
          <div className="flex items-end justify-between gap-2">
            {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((label, index) => (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div className="mb-2 flex h-16 w-full items-end justify-center">
                  <div
                    className="w-full rounded-t bg-primary/30"
                    style={{ height: `${60 + index * 5}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
