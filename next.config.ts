import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  output: "standalone",
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/reconciler",
    "@react-pdf/layout",
    "@react-pdf/primitives",
    "@react-pdf/render",
    "@react-pdf/stylesheet",
    "@react-pdf/font",
    "@react-pdf/textkit",
    "@react-pdf/pdfkit",
    "@react-pdf/fns",
    "@react-pdf/image",
    "@react-pdf/png-js",
    "@react-pdf/types",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // @react-pdf/renderer must never be bundled client-side
      config.resolve.alias["@react-pdf/renderer"] = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
