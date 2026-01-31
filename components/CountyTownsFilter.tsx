'use client'

import { useEffect, useState } from 'react'

/**
 * Client-side search and sort for county towns list.
 * Finds the list by listId; all town links remain in the DOM for crawlers.
 */
export default function CountyTownsFilter({
  listId,
  totalCount,
  showSearchAndSort,
}: {
  listId: string
  totalCount: number
  showSearchAndSort: boolean
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<
    'name' | 'rate-desc' | 'rate-asc' | 'tax-bill-desc' | 'tax-bill-asc'
  >('name')

  useEffect(() => {
    if (!showSearchAndSort) return
    const list = document.getElementById(listId)
    if (!list) return

    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-town-card]'))
    const query = search.trim().toLowerCase()

    items.forEach(item => {
      const name = (item.getAttribute('data-town-name') || '').toLowerCase()
      const matchesSearch = !query || name.includes(query)
      item.style.display = matchesSearch ? '' : 'none'
    })

    const visible = items.filter(el => el.style.display !== 'none')
    const rateNum = (el: HTMLElement) => {
      const v = el.getAttribute('data-town-rate')
      return v ? parseFloat(v) : 0
    }
    const taxBillNum = (el: HTMLElement) => {
      const v = el.getAttribute('data-town-tax-bill')
      return v ? parseFloat(v) : 0
    }
    visible.sort((a, b) => {
      if (sort === 'name') {
        return (a.getAttribute('data-town-name') || '').localeCompare(
          b.getAttribute('data-town-name') || ''
        )
      }
      if (sort === 'rate-desc') return rateNum(b) - rateNum(a)
      if (sort === 'rate-asc') return rateNum(a) - rateNum(b)
      if (sort === 'tax-bill-desc') return taxBillNum(b) - taxBillNum(a)
      if (sort === 'tax-bill-asc') return taxBillNum(a) - taxBillNum(b)
      return 0
    })
    visible.forEach(el => list.appendChild(el))
  }, [listId, search, sort, showSearchAndSort])

  if (!showSearchAndSort || totalCount <= 15) {
    return null
  }

  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4">
      <input
        type="search"
        placeholder="Search towns…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="flex-1 px-3 py-2 border border-border rounded-lg bg-bg text-text placeholder:text-text-muted"
        aria-label="Search towns"
      />
      <select
        value={sort}
        onChange={e =>
          setSort(
            e.target.value as 'name' | 'rate-desc' | 'rate-asc' | 'tax-bill-desc' | 'tax-bill-asc'
          )
        }
        className="px-3 py-2 border border-border rounded-lg bg-bg text-text"
        aria-label="Sort towns"
      >
        <option value="name">A–Z</option>
        <option value="rate-desc">Highest rate first</option>
        <option value="rate-asc">Lowest rate first</option>
        <option value="tax-bill-desc">Highest avg tax bill first</option>
        <option value="tax-bill-asc">Lowest avg tax bill first</option>
      </select>
    </div>
  )
}
