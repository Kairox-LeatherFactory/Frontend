/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://frontend-rust-pi-23.vercel.app/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;