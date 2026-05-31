import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cormorant.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
