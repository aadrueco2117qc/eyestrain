/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // read-excel-file uses unzipper which optionally imports @aws-sdk/client-s3.
  // That optional dep doesn't exist in this project, so we tell webpack to
  // treat it as an external (empty module) to prevent the build from failing.
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent optional AWS SDK dependency in unzipper from failing the build
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        '@aws-sdk/client-s3',
      ]
    }
    return config
  },
}

export default nextConfig
