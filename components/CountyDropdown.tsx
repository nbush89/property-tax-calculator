'use client'

import { getAllCountyNames } from '@/utils/getCountyRates'
import Select from '@/components/ui/Select'

type CountyDropdownProps = {
  value: string
  onChange: (value: string) => void
}

export default function CountyDropdown({ value, onChange }: CountyDropdownProps) {
  const counties = getAllCountyNames()

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
