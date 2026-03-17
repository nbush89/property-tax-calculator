import Link from 'next/link'

export interface CountyTownDirectoryItem {
  name: string
  href: string
  rate?: number | null
  taxBill?: number | null
}

export interface CountyTownDirectoryProps {
  /** Unique id for the list (for CountyTownsFilter / CountyTownsLoadMore) */
  listId: string
  towns: CountyTownDirectoryItem[]
  /** Optional: format tax bill for display */
  formatTaxBill?: (value: number) => string
}

/**
 * Crawlable grid of town links for a county towns directory page.
 * All links are in the DOM for SEO; client filter/load-more only hide/show.
 */
export default function CountyTownDirectory({
  listId,
  towns,
  formatTaxBill = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v),
}: CountyTownDirectoryProps) {
  if (towns.length === 0) return null

  return (
    <ul
      id={listId}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none"
      aria-label="Towns in this county"
    >
      {towns.map((town, index) => (
        <li key={town.href}>
          <Link
            href={town.href}
            data-town-card
            data-town-index={index}
            data-town-name={town.name}
            data-town-rate={town.rate != null ? String(town.rate) : ''}
            data-town-tax-bill={town.taxBill != null ? String(town.taxBill) : ''}
            className="block p-4 bg-surface border border-border rounded-lg hover:bg-bg transition-colors text-text"
          >
            <span className="font-semibold text-text">{town.name}</span>
            <div className="mt-2 text-sm text-text-muted">
              {town.rate != null && (
                <span>Effective rate: {town.rate.toFixed(2)}%</span>
              )}
              {town.taxBill != null && (
                <span className={town.rate != null ? ' block mt-1' : ''}>
                  Avg tax bill: {formatTaxBill(town.taxBill)}
                </span>
              )}
            </div>
            <span className="block text-sm text-primary mt-2">View town →</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
