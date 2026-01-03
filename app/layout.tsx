import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NJ Property Tax Calculator | Estimate Your New Jersey Property Taxes',
    template: '%s | NJ Property Tax Calculator',
  },
  description: 'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis—all free and no sign-up required.',
  keywords: ['New Jersey property tax', 'NJ property tax calculator', 'property tax estimator', 'New Jersey real estate taxes', 'NJ tax calculator'],
  authors: [{ name: 'NJ Property Tax Calculator' }],
  creator: 'NJ Property Tax Calculator',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yoursite.com',
    siteName: 'NJ Property Tax Calculator',
    title: 'NJ Property Tax Calculator | Estimate Your New Jersey Property Taxes',
    description: 'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis.',
    images: [
      {
        url: '/logo-icon.png',
        width: 1200,
        height: 630,
        alt: 'NJ Property Tax Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NJ Property Tax Calculator',
    description: 'Calculate your New Jersey property taxes in seconds.',
    images: ['/logo-icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
