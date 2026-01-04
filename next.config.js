/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Rewrite /sitemaps/*.xml to /sitemaps/* so route handlers can process them
      {
        source: '/sitemaps/:name.xml',
        destination: '/sitemaps/:name',
      },
    ]
  },
}

module.exports = nextConfig
