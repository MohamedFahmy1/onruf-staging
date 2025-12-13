/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ["onrufwebsite6-001-site1.htempurl.com", "onruf.vercel.app", "malqaa-002-site4.stempurl.com"],
  },
  // distDir: "build",
  i18n: {
    locales: ["ar", "en"],
    defaultLocale: "ar",
  },
}
module.exports = nextConfig
