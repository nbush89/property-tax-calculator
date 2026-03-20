import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import './globals.css'
import { Analytics } from '@/components/site/Analytics'
import { PageViewTracker } from '@/components/site/PageViewTracker'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} | Property tax calculator & rates by state`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Estimate and compare property taxes by state, county, and town using public data. Planning-focused calculator with rates and trends—includes New Jersey, Texas, and more states as data is added. Free, no sign-up.',
  keywords: [
    'property tax calculator',
    'property tax by state',
    'county property tax rates',
    'town property tax estimate',
    'New Jersey property tax',
    'Texas property tax',
    'effective tax rate',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Property tax calculator & rates by state`,
    description:
      'Estimate property taxes by location with county and town context, optional relief where modeled, and links to official sources. Planning estimates only—not a substitute for a tax bill.',
    images: [
      {
        url: '/logo-icon.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description:
      'Property tax planning estimates by state, county, and town. Compare rates and run the calculator where supported.',
    images: ['/logo-icon.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <Analytics />
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'system';
                const resolvedTheme = theme === 'system' 
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : theme;
                if (resolvedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
