import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { SITE_URL } from '@/lib/site'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
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
  description:
    'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis—all free and no sign-up required.',
  keywords: [
    'New Jersey property tax',
    'NJ property tax calculator',
    'property tax estimator',
    'New Jersey real estate taxes',
    'NJ tax calculator',
  ],
  authors: [{ name: 'NJ Property Tax Calculator' }],
  creator: 'NJ Property Tax Calculator',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'NJ Property Tax Calculator',
    title: 'NJ Property Tax Calculator | Estimate Your New Jersey Property Taxes',
    description:
      'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis.',
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
