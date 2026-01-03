'use client'

import { useState } from 'react'
import CountyDropdown from './CountyDropdown'
import MunicipalityDropdown from './MunicipalityDropdown'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import njExemptions from '@/data/nj_exemptions.json'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!homeValue || !county) {
      alert('Please fill in all required fields')
      return
    }

    setIsCalculating(true)
    
    try {
      const response = await fetch('/api/calculate-tax', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homeValue: parseFloat(homeValue),
          county,
          town: town || undefined,
          propertyType,
          exemptions: selectedExemptions,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        // Dispatch custom event to update results component
        window.dispatchEvent(new CustomEvent('taxCalculated', { detail: data }))
      } else {
        alert(data.error || 'Failed to calculate property tax. Please try again.')
      }
    } catch (error) {
      console.error('Error calculating tax:', error)
      alert('Failed to calculate property tax. Please try again.')
    } finally {
      setIsCalculating(false)
    }
  }

  const exemptionOptions = Object.keys(njExemptions).map((key) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    amount: njExemptions[key as keyof typeof njExemptions],
  }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-semibold text-text mb-6">
        Property Information
      </h2>
      
      <div>
        <label htmlFor="homeValue" className="block text-sm font-medium text-text mb-2">
          Home Value ($)
        </label>
        <Input
          type="number"
          id="homeValue"
          value={homeValue}
          onChange={(e) => setHomeValue(e.target.value)}
          placeholder="Enter home value"
          required
          min="0"
          step="1000"
        />
      </div>

      <div>
        <label htmlFor="county" className="block text-sm font-medium text-text mb-2">
          County *
        </label>
        <CountyDropdown
          value={county}
          onChange={(value) => {
            setCounty(value)
            setTown('') // Reset town when county changes
          }}
        />
      </div>

      <div>
        <label htmlFor="town" className="block text-sm font-medium text-text mb-2">
          Municipality (Optional)
        </label>
        <MunicipalityDropdown
          county={county}
          value={town}
          onChange={setTown}
          disabled={!county}
        />
      </div>

      <div>
        <label htmlFor="propertyType" className="block text-sm font-medium text-text mb-2">
          Property Type
        </label>
        <Select
          id="propertyType"
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-3">
          Exemptions (Optional)
        </label>
        <div className="space-y-2">
          {exemptionOptions.map((exemption) => (
            <label key={exemption.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedExemptions.includes(exemption.id)}
                onChange={(e) => {
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

      <Button
        type="submit"
        disabled={isCalculating || !homeValue || !county}
        className="w-full"
        size="lg"
      >
        {isCalculating ? 'Calculating...' : 'Calculate Property Tax'}
      </Button>
    </form>
  )
}
