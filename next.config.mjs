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
        destination: 'https://backend-bctk.onrender.com/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
