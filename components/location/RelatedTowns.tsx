import Link from 'next/link'

export interface RelatedTownsProps {
  towns: Array<{ name: string; href: string; compareHref?: string }>
  title?: string
  /** Optional intro below the title */
  intro?: string
}

/**
 * Crawlable list of related town links for a town page (same county).
 * When compareHref is provided on a town, renders a secondary "compare" link next to it.
 */
export default function RelatedTowns({ towns, title = 'Related towns', intro }: RelatedTownsProps) {
  if (towns.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-text mb-2">{title}</h2>
      {intro && <p className="text-sm text-text-muted mb-3 max-w-prose">{intro}</p>}
      <ul className="flex flex-col gap-y-2 list-none">
        {towns.map(({ name, href, compareHref }) => (
          <li key={href} className="flex items-center gap-3">
            <Link href={href} className="text-sm data-link">
              {name}
            </Link>
            {compareHref && (
              <Link
                href={compareHref}
                className="text-xs data-link"
              >
                compare →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
