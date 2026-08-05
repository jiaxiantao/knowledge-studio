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
          ],
        },
        turbopack: {},
      }),
};

export default nextConfig;
