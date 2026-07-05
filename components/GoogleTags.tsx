"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Google Tag Manager + Google Analytics (GA4) - loaded once in the root layout,
 * so they run on every page. Mirrors MetaPixel: next/script (afterInteractive)
 * for the loaders, a <noscript> fallback for GTM, and a route-change pageview
 * (App Router SPA navigations don't reload the page, so the initial snippet's
 * single pageview must be re-fired on each client-side navigation).
 *
 * IDs are public, client-side values from env (with the configured defaults).
 * Each tag renders only when its id is set.
 *
 * NOTE: GA4 is loaded BOTH directly (gtag) and via GTM. If the GTM container
 * also publishes a GA4 config tag for the same property, pageviews double-count
 * - clear NEXT_PUBLIC_GA_ID to let GTM own GA4, or leave GTM empty for gtag only.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-PC7PQBSJ";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-ENEMM2LD0B";

export default function GoogleTags() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    if (!GTM_ID && !GA_ID) return;
    // The base snippets already fired a pageview on first load - skip that run,
    // then track every subsequent client-side route change.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (GA_ID) window.gtag?.("event", "page_view", { page_path: pathname });
    if (GTM_ID) window.dataLayer?.push({ event: "pageview", page: pathname });
  }, [pathname]);

  return (
    <>
      {/* Google Tag Manager */}
      {GTM_ID && (
        <>
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        </>
      )}

      {/* Google Analytics (gtag.js) */}
      {GA_ID && (
        <>
          <Script
            id="ga-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}
    </>
  );
}
