import type { NextConfig } from "next";

const isGhPages = process.env.GH_PAGES === "1";
const ghPagesBasePath = (
  process.env.GH_PAGES_BASE_PATH ?? "/knowledge-studio"
).replace(/\/$/, "") || "/knowledge-studio";

const nextConfig: NextConfig = {
  output: isGhPages ? "export" : "standalone",
  basePath: isGhPages ? ghPagesBasePath : undefined,
  assetPrefix: isGhPages ? ghPagesBasePath : undefined,
  trailingSlash: isGhPages ? true : undefined,
  images: {
    unoptimized: isGhPages,
  },
  serverExternalPackages: [
    "@hyzyla/pdfium",
    "@napi-rs/canvas",
    "tesseract.js",
    "pdf-parse",
    "pdfjs-dist",
    "officeparser",
    "mammoth",
    "xlsx",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "160mb",
    },
    proxyClientMaxBodySize: "160mb",
  },
  ...(isGhPages
    ? {
        env: {
          NEXT_PUBLIC_BASE_PATH: ghPagesBasePath,
          NEXT_PUBLIC_STATIC_EXPORT: "1",
        },
        turbopack: {},
      }
    : {
        outputFileTracingIncludes: {
          "/*": [
            "./node_modules/.prisma/client/**/*",
            "./node_modules/@prisma/client/**/*",
            "./node_modules/@hyzyla/pdfium/**/*",
            "./node_modules/@napi-rs/canvas/**/*",
            "./node_modules/tesseract.js/**/*",
            "./node_modules/tesseract.js-core/**/*",
            "./node_modules/@tesseract.js-data/**/*",
            "./node_modules/pdfjs-dist/cmaps/**/*",
            "./node_modules/pdfjs-dist/standard_fonts/**/*",
          ],
        },
        turbopack: {},
      }),
};

export default nextConfig;
