'use client'

import { useState } from 'react'
import Link from 'next/link'
import CountyDropdown from './CountyDropdown'
import MunicipalityDropdown from './MunicipalityDropdown'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { slugifyLocation } from '@/utils/locationUtils'
import { trackEvent } from '@/lib/analytics'
import { validateTaxForm } from '@/lib/tax-form-schema'
import { ReliefProgramsCalculatorSection } from '@/components/calculator/ReliefProgramsCalculatorSection'
import type { SelectedReliefInputs } from '@/lib/relief/types'

type TaxFormProps = {
  /** State slug for API, deep links, and county/town pages (e.g. new-jersey, texas). */
  stateSlug?: string
  defaultCounty?: string
  defaultMunicipality?: string
  /** County names from state data; pass from server so dropdown uses state JSON as source of truth. */
  countyNames?: string[]
  /** Municipalities by county name; pass from server. */
  municipalitiesByCounty?: Record<string, string[]>
}

function analyticsStateFromSlug(slug: string): string {
  if (slug === 'new-jersey') return 'NJ'
  if (slug === 'texas') return 'TX'
  return slug.slice(0, 2).toUpperCase()
}

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'commercial', label: 'Commercial' },
]

export default function TaxForm({
  stateSlug = 'new-jersey',
  defaultCounty,
  defaultMunicipality,
  countyNames = [],
  municipalitiesByCounty = {},
}: TaxFormProps) {
  const analyticsState = analyticsStateFromSlug(stateSlug)
  const isNj = stateSlug === 'new-jersey'
  const isTx = stateSlug === 'texas'
  const [homeValue, setHomeValue] = useState('')
  const [county, setCounty] = useState(defaultCounty || '')
  const [town, setTown] = useState(defaultMunicipality || '')
  const [propertyType, setPropertyType] = useState('single_family')
  const [reliefSelections, setReliefSelections] = useState<SelectedReliefInputs>({})
  const [isCalculating, setIsCalculating] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const validation = validateTaxForm({
      homeValue,
      county,
      town,
      propertyType,
      selectedExemptions: [],
    })

    if (!validation.success) {
      setErrors(validation.errors)
      return
    }

    const payload = validation.data
    setIsCalculating(true)

    try {
      const response = await fetch('/api/calculate-tax', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homeValue: payload.homeValue,
          county: payload.county,
          town: payload.town || undefined,
          propertyType: payload.propertyType,
          exemptions: [],
          reliefSelections,
          stateSlug,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        trackEvent('calculate_tax', {
          state: analyticsState,
          page_type: 'calculator',
          county: slugifyLocation(payload.county),
          town: payload.town ? slugifyLocation(payload.town) : undefined,
          home_value: payload.homeValue,
          property_type: payload.propertyType,
          exemptions_count: Object.values(reliefSelections).filter(v => v === true).length,
        })
        window.dispatchEvent(new CustomEvent('taxCalculated', { detail: result }))
      } else {
        alert(result.error || 'Failed to calculate property tax. Please try again.')
      }
    } catch (error) {
      console.error('Error calculating tax:', error)
      alert('Failed to calculate property tax. Please try again.')
    } finally {
      setIsCalculating(false)
    }
  }

  function toggleRelief(programId: string, checked: boolean) {
    setReliefSelections(prev => {
      const next = { ...prev }
      if (checked) next[programId] = true
      else delete next[programId]
      return next
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <h2 className="text-2xl font-semibold text-text mb-6">Property Information</h2>

      <div>
        <label htmlFor="homeValue" className="block text-sm font-medium text-text mb-2">
          Home Value ($)
        </label>
        <Input
          type="number"
          id="homeValue"
          value={homeValue}
          onChange={e => {
            setHomeValue(e.target.value)
            if (errors.homeValue)
              setErrors(
                prev => ({ ...prev, homeValue: undefined }) as Partial<Record<string, string>>
              )
          }}
          placeholder="Enter home value"
          required
          min="0"
          step="1000"
          aria-invalid={!!errors.homeValue}
          aria-describedby={errors.homeValue ? 'homeValue-error' : undefined}
        />
        {errors.homeValue && (
          <p id="homeValue-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.homeValue}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="county" className="block text-sm font-medium text-text mb-2">
          County *
        </label>
        <CountyDropdown
          value={county}
          onChange={value => {
            setCounty(value)
            setTown('') // Reset town when county changes
            if (errors.county)
              setErrors(prev => ({ ...prev, county: undefined }) as Partial<Record<string, string>>)
            if (value)
              trackEvent('select_county', {
                state: 'NJ',
                page_type: 'calculator',
                county: slugifyLocation(value),
              })
          }}
          countyNames={countyNames}
        />
        {errors.county && (
          <p id="county-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.county}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="town" className="block text-sm font-medium text-text mb-2">
          Municipality (Optional)
        </label>
        <MunicipalityDropdown
          county={county}
          value={town}
          onChange={value => {
            setTown(value)
            if (value)
              trackEvent('select_town', {
                state: analyticsState,
                page_type: 'calculator',
                county: slugifyLocation(county),
                town: slugifyLocation(value),
              })
          }}
          disabled={!county}
          municipalitiesByCounty={municipalitiesByCounty}
        />
        {county && (
          <div className="mt-2 text-sm">
            <Link
              href={`/${stateSlug}/${slugifyLocation(county)}-county-property-tax`}
              className="text-primary hover:text-primary-hover underline"
            >
              View {county} County property tax page →
            </Link>
            {town && <span className="text-text-muted"> | </span>}
            {town && (
              <Link
                href={`/${stateSlug}/${slugifyLocation(county)}/${slugifyLocation(town)}-property-tax`}
                className="text-primary hover:text-primary-hover underline"
              >
                View {town} property tax page →
              </Link>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="propertyType" className="block text-sm font-medium text-text mb-2">
          Property Type
        </label>
        <Select
          id="propertyType"
          value={propertyType}
          onChange={e => setPropertyType(e.target.value)}
        >
          {PROPERTY_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </div>

      {(isNj || isTx) && (
        <ReliefProgramsCalculatorSection
          stateSlug={stateSlug}
          reliefSelections={reliefSelections}
          onToggleProgram={toggleRelief}
        />
      )}

      <Button type="submit" disabled={isCalculating} className="w-full" size="lg">
        {isCalculating ? 'Calculating...' : 'Calculate Property Tax'}
      </Button>
    </form>
  )
}
