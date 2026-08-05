/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
<<<<<<< HEAD
       destination: 'http://localhost:8000/api/v1/:path*',
=======
        destination: 'http://localhost:8000/api/v1/:path*',
>>>>>>> e3d93a16f7949ac5fd091c9a6d726ff434535d05
      },
    ];
  },
};

export default nextConfig;