const BACKEND_URL =
  process.env.NEXT_API_BASE_URL ||
  'https://leather-factory-intelligence-platform.onrender.com';

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
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

// import { withBetterStack } from '@logtail/next';

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   devIndicators: {
//     appIsrStatus: false,
//     buildActivity: false,
//   },
//   async rewrites() {
//     return [
//       {
//         source: '/api/v1/:path*',
//         destination: 'https://leather-factory-intelligence-platform.onrender.com/api/v1/:path*',
        
//       },
//     ];
//   },
// };

// export default withBetterStack(nextConfig);
