import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-bg">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/new-jersey/property-tax-calculator"
                  className="text-sm text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Calculator
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-sm text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Feedback
                </Link>
              </li>
              <li>
                <Link
                  href="/methodology"
                  className="text-sm text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Methodology
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text">
              Disclaimer
            </h3>
            <p className="text-sm text-text-muted">
              Estimates only. Actual tax bills depend on assessments and exemptions. Verify with
              your county tax assessor.
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Data sources: NJ Division of Taxation and U.S. Census Bureau.{' '}
              <Link href="/methodology" className="underline">
                See methodology
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8">
          <p className="text-center text-sm text-text-muted">
            © {currentYear} NJ Property Tax Calculator. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
