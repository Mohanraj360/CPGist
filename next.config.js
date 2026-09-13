/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep preview's development artifacts isolated from stale webpack output.
  distDir: ".next-preview",
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

module.exports = nextConfig;
