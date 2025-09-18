/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.clerk.com', 'images.unsplash.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    // If a backend base URL is provided, proxy /api/* to it
    if (base) {
      return [
        {
          source: '/api/:path*',
          destination: `${base}/api/:path*`,
        },
      ];
    }
    return [];
  },
}

module.exports = nextConfig
