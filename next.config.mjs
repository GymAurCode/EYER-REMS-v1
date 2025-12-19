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
  webpack: (config, { isServer, dev }) => {
    // Fix for webpack hash calculation issues
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
      };
    }
    
    // Improve HMR and chunk loading in development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    return config;
  },
  // Increase build timeout for large projects
  staticPageGenerationTimeout: 120,
  // Improve dev server stability
  experimental: {
    // Enable faster refresh
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // Add better error handling for chunk loading
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig
