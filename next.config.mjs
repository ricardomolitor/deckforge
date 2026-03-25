/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  // Increase API route response size for large PPTX templates (86-120MB)
  serverRuntimeConfig: {
    maxResponseSize: 200 * 1024 * 1024, // 200MB
  },
};

export default nextConfig;
