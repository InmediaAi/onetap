/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the Next.js dev-tools indicator (the "N" badge, bottom-left in dev).
  devIndicators: false,
  images: {
    // Serve product images resized + from Vercel's CDN (removes those bytes from
    // Supabase's egress meter). Paths are content-addressed, so cache long.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
