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
        //destination: 'http://127.0.0.1:8000/api/v1/:path*',
        destination: 'https://staging-api-lf.kairoxaitech.com/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
