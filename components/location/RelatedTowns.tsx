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
      <h2 className="text-2xl font-semibold text-text mb-2">{title}</h2>
      {intro && <p className="text-sm text-text-muted mb-3 max-w-prose">{intro}</p>}
      <ul className="flex flex-wrap gap-2 list-none">
        {towns.map(({ name, href, compareHref }) => (
          <li key={href}>
            <Link
              href={compareHref ?? href}
              className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-sm text-text hover:border-primary hover:text-primary transition-colors"
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
