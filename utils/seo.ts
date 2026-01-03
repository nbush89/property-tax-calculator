export type SEOData = {
  title: string
  description: string
  canonical?: string
  keywords?: string
  openGraph?: {
    title?: string
    description?: string
    type?: string
    url?: string
  }
}

export function generateStructuredData(data: {
  title: string
  description: string
  url?: string
  type?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': data.type || 'WebApplication',
    name: data.title,
    description: data.description,
    url: data.url,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
  }
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

