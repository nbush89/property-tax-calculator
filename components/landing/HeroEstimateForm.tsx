'use client'

import { useState } from 'react'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { trackEvent } from '@/lib/analytics'
import { buildCalculatorHref } from '@/lib/links/hero'
import type { StateOptionForHero } from '@/lib/geo'
import { useRouter } from 'next/navigation'

type HeroEstimateFormProps = {
  states: StateOptionForHero[]
}

export default function HeroEstimateForm({ states }: HeroEstimateFormProps) {
  const router = useRouter()
  const [stateSlug, setStateSlug] = useState('')

  const handleStateChange = (value: string) => {
    setStateSlug(value)
    if (value) {
      trackEvent('select_state', { state: value })
    }
  }

  const handleCtaClick = () => {
    if (!stateSlug) return
    trackEvent('cta_continue_to_calculator', {
      page_type: 'hero' as const,
      state: stateSlug,
    })
    const href = buildCalculatorHref({ stateSlug })
    router.push(href)
  }

  // Only surface states that are production-ready in the hero.
  const popularStates = ['new-jersey'] as const
  const popularStateOptions = states.filter(s => popularStates.includes(s.slug as any))
  const selectableStates = states.filter(s => s.slug === 'new-jersey')

  return (
    <div className="w-full max-w-md">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h3 className="mb-2 text-lg font-semibold text-text">Estimate your property taxes</h3>
        <p className="mb-6 text-sm text-text-muted">
          Choose your state to continue to the full calculator. You&apos;ll see detailed results and
          a full breakdown on the next page.
        </p>

        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">State</label>
            <Select
              value={stateSlug}
              onChange={e => handleStateChange(e.target.value)}
              aria-label="Select state"
            >
              <option value="">Select state...</option>
              {selectableStates.map(s => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          {popularStateOptions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-text-muted">Popular states</p>
              <div className="flex flex-wrap gap-2">
                {popularStateOptions.map(s => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => {
                      handleStateChange(s.slug)
                      handleCtaClick()
                    }}
                    className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-text hover:border-primary hover:bg-primary/5"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center"
            disabled={!stateSlug}
            type="button"
            onClick={handleCtaClick}
          >
            Continue to calculator →
          </Button>
          <p className="mt-3 text-xs text-text-muted">
            You&apos;ll choose county, town, and home value on the calculator page.
          </p>
        </div>
      </div>
    </div>
  )
}
