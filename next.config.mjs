/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the Next.js dev-tools indicator (the "N" badge, bottom-left in dev).
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
};

export default nextConfig;
