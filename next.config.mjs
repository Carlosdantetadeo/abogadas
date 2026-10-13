/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [{ source: '/index.html', destination: '/', permanent: true }];
  },
};

export default nextConfig;
