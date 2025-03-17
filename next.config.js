/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      // Enable Turbopack
      enabled: true,
    },
  },
}

module.exports = nextConfig 