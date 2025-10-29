import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Redirect to dashboard if authenticated and trying to access /login
    if (path === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Check access rights for admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Public pages (including homepage)
        if (path === "/" || path === "/login" || path === "/register") {
          return true;
        }

        // API routes for support tickets
        if (path.startsWith("/api/support-tickets")) {
          return !!token && (token.role === "ADMIN" || token.role === "TENANT_ADMIN");
        }

        // All other pages require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/tickets/:path*", "/login"],
  // Homepage (/) is accessible without authentication
};

