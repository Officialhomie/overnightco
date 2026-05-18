import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const ALLOWED_ORIGINS = [
  "https://svc-mp9pjv3pc4qow92z.buildwithlocus.com",
  "https://overnightco.vercel.app",
  "http://localhost:3000",
];

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

function getAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const allowedOrigin = getAllowedOrigin(req);

  // Handle CORS preflight for all API routes
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const res = new NextResponse(null, { status: 204 });
    if (allowedOrigin) {
      res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    }
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      res.headers.set(k, v);
    }
    return res;
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Protect internal API routes (route itself also checks CRON_SECRET)
  if (pathname.startsWith("/api/internal")) {
    return;
  }

  // Add CORS headers to all other API responses
  if (pathname.startsWith("/api/") && allowedOrigin) {
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      res.headers.set(k, v);
    }
    return res;
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|llms.txt).*)",
  ],
};
