import React from "react";

/**
 * JsonLd Component
 * 
 * Renders JSON-LD structured data for SEO. Used across the app to inject
 * schema.org markup (Organization, WebSite, WebApplication, FAQPage, BreadcrumbList).
 * 
 * Usage:
 * - Homepage: Organization, WebSite, WebApplication, BreadcrumbList
 * - Calculator pages: WebApplication, BreadcrumbList
 * - FAQ page: FAQPage, BreadcrumbList
 * - Other pages: BreadcrumbList (as needed)
 * 
 * All JSON-LD schemas are generated in lib/jsonld.ts using helpers from lib/site.ts
 * for consistent URLs and site configuration.
 */
type JsonLdProps = {
  data: Record<string, any>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify is required; keep it deterministic
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
