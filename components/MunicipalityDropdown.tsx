'use client'

import { useEffect, useState } from 'react'
import { getMunicipalitiesByCounty } from '@/utils/getMunicipalRates'
import Select from '@/components/ui/Select'

type MunicipalityDropdownProps = {
  county: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function MunicipalityDropdown({ county, value, onChange, disabled }: MunicipalityDropdownProps) {
  const [municipalities, setMunicipalities] = useState<string[]>([])

  useEffect(() => {
    if (county) {
      const munis = getMunicipalitiesByCounty(county)
      setMunicipalities(munis)
    } else {
      setMunicipalities([])
    }
  }, [county])

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || !county || municipalities.length === 0}
    >
      <option value="">
        {!county ? 'Select a county first' : municipalities.length === 0 ? 'No municipalities found' : 'Select a municipality (optional)'}
      </option>
      {municipalities.map((municipality) => (
        <option key={municipality} value={municipality}>
          {municipality}
        </option>
      ))}
    </Select>
  )
}
