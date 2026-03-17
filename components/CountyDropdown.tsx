'use client'

import Select from '@/components/ui/Select'

type CountyDropdownProps = {
  value: string
  onChange: (value: string) => void
  /** County names from state data (e.g. getCountyNames(getStateData('new-jersey'))). Pass from server. */
  countyNames?: string[]
}

export default function CountyDropdown({ value, onChange, countyNames = [] }: CountyDropdownProps) {
  const counties = countyNames.length > 0 ? countyNames : []

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a county</option>
      {counties.map((county) => (
        <option key={county} value={county}>
          {county}
        </option>
      ))}
    </Select>
  )
}
