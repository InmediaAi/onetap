import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at /manifest.webmanifest; Next injects the
 * <link rel="manifest">). Provides the Android / installable-PWA icons; the
 * browser-tab favicon, SVG icon and Apple touch icon come from the file
 * conventions in app/ (icon.svg, favicon.ico, apple-icon.png).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OneTap Atelier",
    short_name: "OneTap Atelier",
    description:
      "A private edit of the season's most considered pieces — each seen on you before it is yours.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Full-bleed square doubles as the Android maskable icon.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
