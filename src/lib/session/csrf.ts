import "server-only";

import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/session/constants";
import { csrfCookieOptions } from "@/lib/session/cookies";

export function createCsrfToken(): string {
  return crypto.randomUUID();
}

export async function ensureCsrfCookie(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;

  if (existing) {
    return existing;
  }

  const token = createCsrfToken();
  store.set(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
}

export async function assertCsrf(request: Request): Promise<void> {
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new AppError("FORBIDDEN");
  }
}

function originFromUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  const allowed = new Set<string>();
  const requestOrigin = originFromUrl(request.url);
  if (requestOrigin) {
    allowed.add(requestOrigin);
  }

  const forwardedHost = (
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  )
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = (
    request.headers.get("x-forwarded-proto") ?? "https"
  )
    .split(",")[0]
    ?.trim();
  if (forwardedHost && forwardedProto) {
    allowed.add(`${forwardedProto}://${forwardedHost}`);
  }

  const siteOrigin = originFromUrl(process.env.SITE_URL);
  if (siteOrigin) {
    allowed.add(siteOrigin);
  }

  if (!allowed.has(origin)) {
    throw new AppError("FORBIDDEN");
  }
}
