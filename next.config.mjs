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
    unoptimized: false,
  },
  webpack: (config, { isServer }) => {
    // Fix for webpack hash calculation issues
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
      };
    }
    return config;
  },
  // Increase build timeout for large projects
  staticPageGenerationTimeout: 120,
}

export default nextConfig
