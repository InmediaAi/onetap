import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import SessionLoader from "@/components/SessionLoader";
import MetaPixel from "@/components/MetaPixel";
import { ToastProvider } from "@/components/Toast";

// Display typeface — a modern grotesque sans for headings & product names
// (the crisp, editorial black-&-white look). Body stays Helvetica Neue.
const display = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
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
        <MetaPixel />
        <AnalyticsProvider />
        <SessionLoader />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
