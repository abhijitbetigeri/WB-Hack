import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@openai/agents': './lib/stubs/openai-agents.js',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@openai/agents': false,
    }
    return config
  },
}

export default nextConfig
