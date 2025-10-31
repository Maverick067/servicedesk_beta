/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Output standalone for Docker deployment
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001'],
    },
  },
  // Ensure proper asset handling
  assetPrefix: undefined,
  generateEtags: true,
}

module.exports = nextConfig

