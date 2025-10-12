import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  // Enable Unicode support in URLs
  trailingSlash: false,
  images: {
    domains: ["res.cloudinary.com"],
  },
};

export default withNextIntl(nextConfig);
