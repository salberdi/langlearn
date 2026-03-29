/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['kuromoji', 'drizzle-orm', 'pg', '@aws-sdk/client-s3'],
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
