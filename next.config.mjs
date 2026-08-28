/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://staging-api-lf.kairoxaitech.com/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;