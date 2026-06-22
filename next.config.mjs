/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed rewrites to prevent Turbopack panics.
  // We use a custom Route Handler proxy in src/app/api/v1/[...path]/route.js instead.
};

export default nextConfig;
