/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/shakabumbo.jpg", destination: "/api/assets/shakabumbo", permanent: false },
      { source: "/shakabumbo-guardian.webp", destination: "/api/assets/shakabumbo-guardian", permanent: false },
    ];
  },
};

export default nextConfig;
