import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid picking a parent folder lockfile as the tracing root when multiple exist
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {}
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        canvas: false,
      }
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        canvas: false,
      }
    }

    config.externals = Array.isArray(config.externals) ? config.externals : []
    config.externals.push({ canvas: 'commonjs canvas' })

    return config
  },
  // Enable image optimization for better performance
  // Set to true only if you need to work around deployment issues
  images: {
    unoptimized: false,
    remotePatterns: [],
  },
  env: {
    NEXT_DISABLE_DEVTOOLS: '1',
  },
  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
}

export default nextConfig
