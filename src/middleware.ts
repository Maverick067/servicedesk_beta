import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Редирект на дашборд если авторизован и пытается зайти на /login
    if (path === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Проверка прав доступа для админских роутов
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Публичные страницы
        if (path === "/login" || path === "/register") {
          return true;
        }

        // Все остальные страницы требуют авторизации
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/tickets/:path*", "/login"],
};

