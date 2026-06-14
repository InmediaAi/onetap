import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import SessionLoader from "@/components/SessionLoader";
import MetaPixel from "@/components/MetaPixel";

// Primary editorial typeface. Light/Regular/Medium + italics, per the
// brand guidelines (no weights above Medium).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneTap Atelier — New In",
  description:
    "A private edit of the season's most considered pieces — each seen on you before it is yours.",
};

// Mobile-first: lock to device width, allow user zoom (accessibility).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A1814",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cormorant.variable}>
      <body className="font-sans antialiased">
        <MetaPixel />
        <AnalyticsProvider />
        <SessionLoader />
        {children}
      </body>
    </html>
  );
}
