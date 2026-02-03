'use client'

import Script from 'next/script'

export function Analytics() {
  const GA_ID = process.env.NEXT_PUBLIC_GA4_ID
  const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

  if (!GA_ID && !CLARITY_ID) return null

  return (
    <>
      {/* Google Analytics */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;

              gtag('js', new Date());

              // Fully manual page_view tracking (SPA-safe)
              gtag('config', '${GA_ID}', { send_page_view: false });

              // Send initial page_view explicitly (include query string)
              gtag('event', 'page_view', {
                page_path: window.location.pathname + window.location.search,
                page_location: window.location.href,
                page_title: document.title
              });
            `}
          </Script>
        </>
      )}

      {/* Microsoft Clarity */}
      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      )}
    </>
  )
}
