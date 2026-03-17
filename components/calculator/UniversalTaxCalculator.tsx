'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { slugifyLocation } from '@/utils/locationUtils'
import { trackEvent } from '@/lib/analytics'
import { validateTaxForm } from '@/lib/tax-form-schema'
import TaxResults from '@/components/TaxResults'
import type { StateOptionForHero } from '@/lib/geo'
import njExemptions from '@/data/nj_exemptions.json'

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'commercial', label: 'Commercial' },
] as const

export type CalculatorInitialValues = {
  stateSlug?: string
  countySlug?: string
  townSlug?: string
  homeValue?: string
}

type UniversalTaxCalculatorProps = {
  states: StateOptionForHero[]
  initialValues?: CalculatorInitialValues
  showStateSelect?: boolean
  /** Optional page context for analytics */
  pageType?: 'calculator' | 'hero' | 'header' | 'state' | 'county' | 'town' | 'blog' | 'static'
}

export default function UniversalTaxCalculator({
  states,
  initialValues,
  showStateSelect = true,
  pageType = 'calculator',
}: UniversalTaxCalculatorProps) {
  const [stateSlug, setStateSlug] = useState(initialValues?.stateSlug ?? '')
  const [countySlug, setCountySlug] = useState(initialValues?.countySlug ?? '')
  const [townSlug, setTownSlug] = useState(initialValues?.townSlug ?? '')
  const [homeValue, setHomeValue] = useState(initialValues?.homeValue ?? '')
  const [propertyType, setPropertyType] = useState('single_family')
  const [selectedExemptions, setSelectedExemptions] = useState<string[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [hasAutoCalculated, setHasAutoCalculated] = useState(false)

  const selectedState = states.find(s => s.slug === stateSlug)
  const selectedCounty = selectedState?.counties.find(c => c.slug === countySlug)
  const selectedTown = selectedCounty?.towns.find(t => t.slug === townSlug)
  const counties = selectedState?.counties ?? []
  const towns = selectedCounty?.towns ?? []

  const isNj = stateSlug === 'new-jersey'
  const countyName = selectedCounty?.name ?? ''
  const townName = selectedTown?.name ?? ''

  const runCalculation = useCallback(async () => {
    if (!isNj || !countyName || !homeValue.trim()) return
    const validation = validateTaxForm({
      homeValue,
      county: countyName,
      town: townName,
      propertyType,
      selectedExemptions,
    })
    if (!validation.success) return

    const payload = validation.data
    setIsCalculating(true)
    try {
      const response = await fetch('/api/calculate-tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeValue: payload.homeValue,
          county: payload.county,
          town: payload.town || undefined,
          propertyType: payload.propertyType,
          exemptions: payload.exemptions,
          stateSlug: stateSlug || 'new-jersey',
        }),
      })
      const result = await response.json()
      if (response.ok) {
        trackEvent('calculate_tax', {
          state: stateSlug,
          page_type: pageType ?? 'calculator',
          county: slugifyLocation(payload.county),
          town: payload.town ? slugifyLocation(payload.town) : undefined,
          home_value: payload.homeValue,
          property_type: payload.propertyType,
          exemptions_count: payload.exemptions.length,
        })
        window.dispatchEvent(new CustomEvent('taxCalculated', { detail: result }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsCalculating(false)
    }
  }, [
    isNj,
    countyName,
    townName,
    homeValue,
    propertyType,
    selectedExemptions,
    stateSlug,
    pageType,
  ])

  // Prefill from initialValues (e.g. query params) and optionally auto-calculate once for NJ
  useEffect(() => {
    if (initialValues?.stateSlug) setStateSlug(initialValues.stateSlug)
    if (initialValues?.countySlug) setCountySlug(initialValues.countySlug)
    if (initialValues?.townSlug) setTownSlug(initialValues.townSlug)
    if (initialValues?.homeValue) setHomeValue(initialValues.homeValue)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  // Auto-run calculation once when opened with prefill (e.g. from homepage or deep link)
  useEffect(() => {
    if (
      hasAutoCalculated ||
      initialValues?.stateSlug !== 'new-jersey' ||
      !initialValues?.countySlug ||
      !initialValues?.homeValue ||
      !selectedCounty
    ) {
      return
    }
    setHasAutoCalculated(true)
    runCalculation()
  }, [
    initialValues?.stateSlug,
    initialValues?.countySlug,
    initialValues?.homeValue,
    hasAutoCalculated,
    selectedCounty,
    runCalculation,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!isNj) {
      setErrors({ county: 'Calculator is currently available for New Jersey. More states coming soon.' })
      return
    }

    const validation = validateTaxForm({
      homeValue,
      county: countyName,
      town: townName,
      propertyType,
      selectedExemptions,
    })

    if (!validation.success) {
      setErrors(validation.errors)
      return
    }

    await runCalculation()
  }

  const handleStateChange = (value: string) => {
    setStateSlug(value)
    setCountySlug('')
    setTownSlug('')
    if (value) trackEvent('select_state', { state: value, page_type: pageType ?? 'calculator' })
  }

  const handleCountyChange = (value: string) => {
    setCountySlug(value)
    setTownSlug('')
    if (value && stateSlug) {
      trackEvent('select_county', { state: stateSlug, county: value, page_type: pageType ?? 'calculator' })
    }
  }

  const handleTownChange = (value: string) => {
    setTownSlug(value)
    if (value && stateSlug && countySlug) {
      trackEvent('select_town', { state: stateSlug, county: countySlug, town: value, page_type: pageType ?? 'calculator' })
    }
  }

  const exemptionOptions = Object.keys(njExemptions).map(key => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    amount: njExemptions[key as keyof typeof njExemptions],
  }))

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <h2 className="text-2xl font-semibold text-text mb-6">Property Information</h2>

          {showStateSelect && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">State *</label>
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
          )}

          <div>
            <label htmlFor="homeValue" className="block text-sm font-medium text-text mb-2">
              Home Value ($) *
            </label>
            <Input
              type="number"
              id="homeValue"
              value={homeValue}
              onChange={e => {
                setHomeValue(e.target.value)
                if (errors.homeValue) setErrors(prev => ({ ...prev, homeValue: undefined }))
              }}
              placeholder="Enter home value"
              min="0"
              step="1000"
              aria-invalid={!!errors.homeValue}
            />
            {errors.homeValue && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.homeValue}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">County *</label>
            <Select
              value={countySlug}
              onChange={e => handleCountyChange(e.target.value)}
              disabled={!stateSlug || counties.length === 0}
              aria-label="Select county"
            >
              <option value="">
                {!stateSlug ? 'Select state first' : counties.length === 0 ? 'No counties' : 'Select county...'}
              </option>
              {counties.map(c => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.county && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.county}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Municipality (Optional)</label>
            <Select
              value={townSlug}
              onChange={e => handleTownChange(e.target.value)}
              disabled={!countySlug || towns.length === 0}
              aria-label="Select town"
            >
              <option value="">
                {!countySlug ? 'Select county first' : towns.length === 0 ? 'No towns' : 'Select town (optional)...'}
              </option>
              {towns.map(t => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </Select>
            {isNj && countyName && (
              <div className="mt-2 text-sm">
                <Link
                  href={`/new-jersey/${slugifyLocation(countyName)}-county-property-tax`}
                  className="text-primary hover:text-primary-hover underline"
                >
                  View {countyName} County property tax page →
                </Link>
                {townName && (
                  <>
                    <span className="text-text-muted"> | </span>
                    <Link
                      href={`/new-jersey/${slugifyLocation(countyName).replace(/-county$/, '')}/${slugifyLocation(townName)}-property-tax`}
                      className="text-primary hover:text-primary-hover underline"
                    >
                      View {townName} property tax page →
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {isNj && (
            <>
              <div>
                <label className="block text-sm font-medium text-text mb-2">Property Type</label>
                <Select value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-3">Exemptions (Optional)</label>
                <div className="space-y-2">
                  {exemptionOptions.map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExemptions.includes(opt.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedExemptions([...selectedExemptions, opt.id])
                          else setSelectedExemptions(selectedExemptions.filter(id => id !== opt.id))
                        }}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-text-muted">
                        {opt.name} (${opt.amount.toLocaleString()})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button type="submit" disabled={isCalculating || !isNj} className="w-full" size="lg">
            {isCalculating ? 'Calculating...' : isNj ? 'Calculate Property Tax' : 'Select New Jersey to calculate'}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <TaxResults stateSlug={stateSlug || 'new-jersey'} />
      </Card>
    </div>
  )
}
