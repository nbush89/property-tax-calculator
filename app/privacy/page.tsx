import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Privacy Policy | NJ Property Tax Calculator',
  description: 'Privacy policy for the NJ Property Tax Calculator. Learn how we handle your data and protect your privacy.',
  keywords: 'privacy policy, data protection, NJ property tax calculator privacy',
})

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose prose-slate mt-8 dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Information We Collect
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                We do not collect, store, or transmit any personal information. All calculations are performed locally in your browser. We do not require sign-ups, accounts, or any personal data to use our calculator.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                How We Use Information
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                Since we do not collect any personal information, there is no data to use, share, or sell. Your privacy is our priority, and we've designed our tool to work entirely without collecting user data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Third-Party Services
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                Our website may use analytics services that collect anonymous usage data to help us improve the site. This data is aggregated and cannot be used to identify individual users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Cookies
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                We may use cookies to enhance your experience, but these are not used to track or identify you personally. You can disable cookies in your browser settings if you prefer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Changes to This Policy
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Contact Us
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                If you have any questions about this privacy policy, please contact us through our website.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

