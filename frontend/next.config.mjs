/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Phone / LAN testing: without this, Next 16 blocks client JS so onClick/taps do nothing.
  allowedDevOrigins: [
    "192.168.18.8",
    "127.0.0.1",
    "localhost",
  ],
};

export default nextConfig;
