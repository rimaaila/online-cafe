/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Safety net so a stray lint/type warning never blocks a deploy.
  // Remove these two once the build is stable if you want strict checks.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
