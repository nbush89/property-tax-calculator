import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

const DEFAULT_DESCRIPTION =
  "Estimate property taxes by state, county, and town. Free, fast, and no signup required.";

type SeoParams = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string;
  noIndex?: boolean;
  openGraph?: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
  };
};

export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  noIndex = false,
  keywords = "",
  openGraph,
}: SeoParams): Metadata {
  // Ensure path starts with / and avoid double slashes
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${SITE_URL}${normalizedPath}`;

  return {
    title,
    description,
    keywords: ['property tax calculator', 'property tax estimator', 'property tax calculator by state', 'property tax calculator by county', 'property tax calculator by town', 'property tax calculator by city', 'property tax calculator by zip code', 'property tax calculator by address'],
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: openGraph?.title || title,
      description: openGraph?.description || description,
      url: openGraph?.url || url,
      siteName: SITE_NAME,
      type: (openGraph?.type as "website" | "article" | undefined) || "website",
      images: openGraph?.images,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
