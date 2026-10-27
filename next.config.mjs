/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // Turbopack config (Next.js 16 uses Turbopack by default).
  // Empty object silences the "webpack config but no turbopack config" warning.
  turbopack: {},

  // read-excel-file → unzipper → optionally imports @aws-sdk/client-s3.
  // That optional dep doesn't exist in this project.
  // serverExternalPackages tells Next.js to NOT bundle these packages —
  // they stay as Node.js require() calls at runtime instead of being
  // statically bundled, which avoids the missing optional dep error.
  serverExternalPackages: ['read-excel-file', 'unzipper'],
}

export default nextConfig
