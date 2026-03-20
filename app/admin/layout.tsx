import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin/publish-readiness" className="font-semibold text-text">
              Admin
            </Link>
            <nav className="flex gap-3 text-sm text-text-muted">
              <Link href="/admin/publish-readiness" className="hover:text-primary">
                Publish readiness
              </Link>
              <Link href="/admin/seo-opportunities" className="hover:text-primary">
                SEO opportunities
              </Link>
            </nav>
          </div>
          <Link href="/" className="text-sm text-text-muted hover:text-primary">
            Exit to site →
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
