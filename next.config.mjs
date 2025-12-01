/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Fixed: Enable TypeScript error checking
  },
  eslint: {
    // Disable ESLint during build to avoid circular structure error
    // ESLint can still be run manually with: npm run lint
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
