import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  // Enable Unicode support in URLs
  trailingSlash: false,
  images: {
    // No remote domains needed; local images under /public/uploads
  },
};

export default withNextIntl(nextConfig);
