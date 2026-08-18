/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "onrufwebsite6-001-site1.htempurl.com",
      },
      {
        protocol: "https",
        hostname: "onruf.vercel.app",
      },
      {
        protocol: "https",
        hostname: "malqaa-002-site4.stempurl.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  i18n: {
    locales: ["ar", "en"],
    defaultLocale: "ar",
  },
}

module.exports = nextConfig
