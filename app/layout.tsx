import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import SessionLoader from "@/components/SessionLoader";
import MetaPixel from "@/components/MetaPixel";
import GoogleTags from "@/components/GoogleTags";
import TryOnProvider from "@/components/TryOnProvider";
import JsonLd from "@/components/seo/JsonLd";
import { ToastProvider } from "@/components/Toast";
import GlobalErrorToaster from "@/components/GlobalErrorToaster";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Site-wide structured data - the brand entity + site (helps Google connect all
// pages, incl. the brand index, to the OneTap Atelier organization).
const SITE_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OneTap Atelier",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OneTap Atelier",
    url: SITE_URL,
  },
];

// Display typeface - a modern grotesque sans for headings & product names
// (the crisp, editorial black-&-white look). Body stays Helvetica Neue.
const display = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "OneTap Atelier - New In",
  description:
    "A private edit of the season's most considered pieces - each seen on you before it is yours.",
  openGraph: {
    title: "OneTap Atelier - New In",
    description:
      "A private edit of the season's most considered pieces - each seen on you before it is yours.",
    siteName: "OneTap Atelier",
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneTap Atelier - New In",
    description:
      "A private edit of the season's most considered pieces - each seen on you before it is yours.",
  },
  // Renders the Google Search Console <meta google-site-verification> only when set.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

// Mobile-first: lock to device width, allow user zoom (accessibility).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={display.variable}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <JsonLd data={SITE_JSONLD} />
        <GoogleTags />
        <MetaPixel />
        <AnalyticsProvider />
        <SessionLoader />
        <ToastProvider>
          <GlobalErrorToaster />
          {children}
          <TryOnProvider />
        </ToastProvider>
      </body>
    </html>
  );
}
