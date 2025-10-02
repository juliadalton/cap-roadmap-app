/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only ignore errors during development, not production
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  images: {
    unoptimized: true, // Keep this if you're not using next/image optimization
  },
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

export default nextConfig
