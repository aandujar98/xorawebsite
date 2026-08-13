import "server-only";

import type { Session } from "@heroiclabs/nakama-js";
import { cookies } from "next/headers";
import { isProduction } from "@/lib/env";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REMEMBER_COOKIE,
} from "@/lib/session/constants";
import type { SessionTokens } from "@/types/account";

type CookieOptions = {
  httpOnly?: boolean;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge?: number;
};

function baseCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
}

function rememberMaxAgeSeconds(session: Session, rememberMe: boolean): number | undefined {
  if (!rememberMe) {
    return undefined;
  }

  const now = Math.floor(Date.now() / 1000);
  const refreshExpires = session.refresh_expires_at ?? now + 60 * 60 * 24 * 7;
  return Math.max(60, refreshExpires - now);
}

export async function readSessionTokens(): Promise<SessionTokens | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (!token || !refreshToken) {
    return null;
  }

  return { token, refreshToken };
}

export async function writeSessionCookies(
  session: Session,
  rememberMe = false,
): Promise<void> {
  const store = await cookies();
  const remembered = rememberMe || store.get(REMEMBER_COOKIE)?.value === "1";
  const maxAge = rememberMaxAgeSeconds(session, remembered);
  const options = baseCookieOptions(maxAge);

  store.set(ACCESS_COOKIE, session.token, options);
  store.set(REFRESH_COOKIE, session.refresh_token, options);
  store.set(REMEMBER_COOKIE, remembered ? "1" : "0", options);
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  const options = baseCookieOptions(0);

  store.set(ACCESS_COOKIE, "", options);
  store.set(REFRESH_COOKIE, "", options);
  store.set(REMEMBER_COOKIE, "", options);
}

export function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
