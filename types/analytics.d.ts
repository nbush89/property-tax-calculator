declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    clarity?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

export {}
