import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The marketing HTML lives in /public. Static files in /public are NOT
  // served at extensionless paths by default, so we rewrite the friendly
  // URLs explicitly. App-router pages (/founder, /funder, /messages, /s,
  // /v, /u, /handler, /welcome, /search, /dev) take precedence and
  // resolve normally.
  async rewrites() {
    return [
      { source: "/", destination: "/index.html" },
      { source: "/founders", destination: "/laelapx.html" },
      { source: "/investors", destination: "/laelapx-investors.html" },
      { source: "/privacy", destination: "/privacy.html" },
      { source: "/terms", destination: "/terms.html" },
    ];
  },
};

export default nextConfig;
