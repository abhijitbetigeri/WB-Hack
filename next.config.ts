import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    // weave tries to optionally import @openai/agents (peer dep not installed).
    // Turbopack/webpack treats it as a hard failure — stub it out.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@openai/agents': false,
    }
    return config
  },
}

export default nextConfig
