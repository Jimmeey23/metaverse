/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the sandboxed preview host (https://3000-<id>.e2b.app) to talk to the dev server.
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai', '*.vercel.app', 'localhost'],
};
export default nextConfig;
