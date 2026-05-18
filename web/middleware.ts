import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { type NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

function isAllowedOrigin(origin: string): boolean {
  if (origin.endsWith(".buildwithlocus.com")) return true;
  return [
    "https://overnightco.vercel.app",
    "http://localhost:3000",
  ].includes(origin);
}

function withCors(res: NextResponse, origin: string | null): NextResponse {
  if (origin && isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

// Auth middleware — only handles non-OPTIONS requests
const authHandler = auth((req) => {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  if (pathname.startsWith("/dashboard") && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Add CORS headers on actual API responses
  if (pathname.startsWith("/api/")) {
    return withCors(NextResponse.next(), origin);
  }
});

// Top-level middleware: intercept OPTIONS before NextAuth sees it
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }

  return (authHandler as (req: NextRequest) => Response | undefined)(req);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|llms.txt).*)",
  ],
};
