/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Support server external packages if needed
  serverExternalPackages: ['msedge-tts', 'ws', 'bufferutil', 'utf-8-validate'],
};

export default nextConfig;
