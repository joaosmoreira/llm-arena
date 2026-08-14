import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable StrictMode in dev to prevent double-invocation of effects
  // which was aborting active SSE streams before they could deliver data.
  reactStrictMode: false,

  async headers() {
    return [
      {
        source: "/api/chat",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-transform" },
          { key: "X-Accel-Buffering", value: "no" },
          { key: "Connection", value: "keep-alive" },
        ],
      },
    ];
  },
};

export default nextConfig;
