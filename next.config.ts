import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (Postgres nhúng dùng khi chạy trên máy) cần nạp file WASM, không đóng gói được.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
