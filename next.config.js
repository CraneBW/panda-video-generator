/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds (optional, if you want to allow type errors)
    // ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
