'use client'

import Select from '@/components/ui/Select'

type MunicipalityDropdownProps = {
  county: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Municipalities for the selected county, keyed by county name. From state data (e.g. getMunicipalitiesByCounty). Pass from server. */
  municipalitiesByCounty?: Record<string, string[]>
}

export default function MunicipalityDropdown({
  county,
  value,
  onChange,
  disabled,
  municipalitiesByCounty = {},
}: MunicipalityDropdownProps) {
  const municipalities = county ? (municipalitiesByCounty[county] ?? []) : []

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
