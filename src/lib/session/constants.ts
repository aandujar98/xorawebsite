export const ACCESS_COOKIE = "xora_at";
export const REFRESH_COOKIE = "xora_rt";
export const CSRF_COOKIE = "xora_csrf";
export const REMEMBER_COOKIE = "xora_rm";

export const CSRF_HEADER = "x-csrf-token";

export const PROTECTED_PATHS = ["/dashboard", "/profile", "/security", "/u"] as const;
export const AUTH_PATHS = ["/login", "/register"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next) {
    return "/dashboard";
  }

  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/dashboard";
  }

  if (next.startsWith("/login") || next.startsWith("/register")) {
    return "/dashboard";
  }

  return next;
}

export function hasSessionCookies(cookies: {
  get: (name: string) => { value: string } | undefined;
}): boolean {
  return Boolean(cookies.get(ACCESS_COOKIE)?.value || cookies.get(REFRESH_COOKIE)?.value);
}

export type ProtectedRouteDecision = "allow" | "login" | "dashboard";

export function getProtectedRouteDecision(input: {
  pathname: string;
  hasSession: boolean;
}): ProtectedRouteDecision {
  if (isProtectedPath(input.pathname) && !input.hasSession) {
    return "login";
  }

  if (isAuthPath(input.pathname) && input.hasSession) {
    return "dashboard";
  }

  return "allow";
}
