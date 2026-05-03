import type { NextConfig } from "next";

const ALLOWED_ORIGINS =
  process.env.NODE_ENV === "production"
    ? [
        process.env.NEXT_PUBLIC_APP_URL ?? "",
        "https://overnightco.vercel.app",
      ].filter(Boolean)
    : ["http://localhost:3000", "http://localhost:3001"];

const primaryOrigin = ALLOWED_ORIGINS[0] ?? "*";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Agent product endpoints — open to all origins (agents call from anywhere)
        source: "/api/product/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
      {
        // Agent catalog — open (machine-readable discovery)
        source: "/api/catalog",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=60" },
        ],
      },
      {
        // llms.txt — open (agent discovery file)
        source: "/llms.txt",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
        ],
      },
      {
        // Product data.json endpoints — open for agent HTTP 402 access
        source: "/product/:id/data.json",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, X-Locus-Payment" },
        ],
      },
      {
        // Dashboard — restricted to known origins
        source: "/api/dashboard/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: primaryOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        // Internal cron endpoints — no public CORS (protected by CRON_SECRET)
        source: "/api/internal/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "none" },
        ],
      },
    ];
  },
};

export default nextConfig;
