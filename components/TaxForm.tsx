'use client'

import { useState } from 'react'
import Link from 'next/link'
import CountyDropdown from './CountyDropdown'
import MunicipalityDropdown from './MunicipalityDropdown'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import njExemptions from '@/data/nj_exemptions.json'
import { slugifyLocation } from '@/utils/locationUtils'
import { trackEvent } from '@/lib/analytics'
import { validateTaxForm } from '@/lib/tax-form-schema'

type TaxFormProps = {
  defaultCounty?: string
  defaultMunicipality?: string
}

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'commercial', label: 'Commercial' },
]

export default function TaxForm({ defaultCounty, defaultMunicipality }: TaxFormProps) {
  const [homeValue, setHomeValue] = useState('')
  const [county, setCounty] = useState(defaultCounty || '')
  const [town, setTown] = useState(defaultMunicipality || '')
  const [propertyType, setPropertyType] = useState('single_family')
  const [selectedExemptions, setSelectedExemptions] = useState<string[]>([])
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
      selectedExemptions,
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
          exemptions: payload.exemptions,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        trackEvent('calculate_tax', {
          state: 'NJ',
          page_type: 'calculator',
          county: slugifyLocation(payload.county),
          town: payload.town ? slugifyLocation(payload.town) : undefined,
          home_value: payload.homeValue,
          property_type: payload.propertyType,
          exemptions_count: payload.exemptions.length,
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

  const exemptionOptions = Object.keys(njExemptions).map(key => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    amount: njExemptions[key as keyof typeof njExemptions],
  }))

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
                state: 'NJ',
                page_type: 'calculator',
                county: slugifyLocation(county),
                town: slugifyLocation(value),
              })
          }}
          disabled={!county}
        />
        {county && (
          <div className="mt-2 text-sm">
            <Link
              href={`/new-jersey/${slugifyLocation(county)}-county-property-tax`}
              className="text-primary hover:text-primary-hover underline"
            >
              View {county} County property tax page →
            </Link>
            {town && <span className="text-text-muted"> | </span>}
            {town && (
              <Link
                href={`/new-jersey/${slugifyLocation(county)}/${slugifyLocation(town)}-property-tax`}
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

      <div>
        <label className="block text-sm font-medium text-text mb-3">Exemptions (Optional)</label>
        <div className="space-y-2">
          {exemptionOptions.map(exemption => (
            <label key={exemption.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedExemptions.includes(exemption.id)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedExemptions([...selectedExemptions, exemption.id])
                  } else {
                    setSelectedExemptions(selectedExemptions.filter(id => id !== exemption.id))
                  }
                }}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
              />
              <span className="text-sm text-text-muted">
                {exemption.name} (${exemption.amount.toLocaleString()})
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isCalculating} className="w-full" size="lg">
        {isCalculating ? 'Calculating...' : 'Calculate Property Tax'}
      </Button>
    </form>
  )
}
