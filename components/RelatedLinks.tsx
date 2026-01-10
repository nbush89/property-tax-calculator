import Link from 'next/link'

interface RelatedLink {
  href: string
  label: string
}

interface RelatedLinksProps {
  links: RelatedLink[]
  className?: string
}

/**
 * Reusable component for rendering related navigation links
 * Displays links inline, separated by dots
 */
export default function RelatedLinks({ links, className = '' }: RelatedLinksProps) {
  if (links.length === 0) {
    return null
  }

  return (
    <nav
      className={`flex flex-wrap items-center gap-2 text-sm text-text-muted ${className}`}
      aria-label="Related pages"
    >
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 && <span className="mx-1">·</span>}
          <Link
            href={link.href}
            className="hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded underline"
          >
            {link.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
