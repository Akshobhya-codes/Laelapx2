import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // The repo root contains a separate Vite project (the marketing site)
    // with its own lockfile. Pin Turbopack to /web so it doesn't get confused.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
