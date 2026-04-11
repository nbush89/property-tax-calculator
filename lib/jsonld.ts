import { LOGO_URL, SITE_NAME, SITE_URL } from "./site";

export function webAppJsonLd({
  name = SITE_NAME,
  pageUrl,
  description,
}: {
  name?: string;
  pageUrl: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    url: pageUrl,
    description,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Works on modern browsers.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function faqJsonLd(
    _pageUrl: string,
    faqs: { question: string; answer: string }[]
  ) {
    // Note: FAQPage does not have a `url` property in Schema.org — removed to keep
    // the schema clean for Google's Rich Results Test. The `_pageUrl` param is kept
    // for call-site compatibility; pass it in case we add mainEntityOfPage later.
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    };
  }
  

  export function breadcrumbJsonLd(
    items: { name: string; url: string }[]
  ) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }


export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    // SearchAction removed - no search page exists
  };
}
