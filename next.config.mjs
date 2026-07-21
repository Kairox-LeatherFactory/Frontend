/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
       destination: 'https://api-lf.kairoxaitech.com/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;