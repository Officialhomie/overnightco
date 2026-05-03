import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Protect internal API routes (also protected by CRON_SECRET in the route itself)
  if (pathname.startsWith("/api/internal")) {
    return; // Let the route handle CRON_SECRET verification
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/internal/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|llms.txt).*)",
  ],
};
