import Link from 'next/link'

export interface RelatedTownsProps {
  towns: Array<{ name: string; href: string }>
  title?: string
  /** Optional intro below the title */
  intro?: string
}

/**
 * Crawlable list of related town links for a town page (same county).
 */
export default function RelatedTowns({ towns, title = 'Related towns', intro }: RelatedTownsProps) {
  if (towns.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-text mb-2">{title}</h2>
      {intro && <p className="text-sm text-text-muted mb-3 max-w-prose">{intro}</p>}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 list-none">
        {towns.map(({ name, href }) => (
          <li key={href}>
            <Link href={href} className="text-primary hover:text-primary-hover underline text-sm">
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
