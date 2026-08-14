import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  getProtectedRouteDecision,
  safeNextPath,
} from "@/lib/session/constants";

function createCsrfToken() {
  return crypto.randomUUID();
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function proxy(request: NextRequest) {
  const hasSession = Boolean(
    request.cookies.get(ACCESS_COOKIE)?.value ||
      request.cookies.get(REFRESH_COOKIE)?.value,
  );
  const decision = getProtectedRouteDecision({
    pathname: request.nextUrl.pathname,
    hasSession,
  });

  let response: NextResponse;

  if (decision === "login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", safeNextPath(request.nextUrl.pathname));
    response = NextResponse.redirect(url);
  } else if (decision === "dashboard") {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    response = NextResponse.next();
  }

  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, createCsrfToken(), {
      httpOnly: false,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
