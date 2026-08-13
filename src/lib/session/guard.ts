import "server-only";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { getCurrentAccount } from "@/lib/nakama/account";
import { clearSessionCookies, readSessionTokens, writeSessionCookies } from "@/lib/session/cookies";
import { restoreAndRefreshSession } from "@/lib/session/restore";
import { safeNextPath } from "@/lib/session/constants";
import type { PublicAccount } from "@/types/account";

export async function loadAuthenticatedAccount(): Promise<{
  account: PublicAccount;
} | null> {
  const tokens = await readSessionTokens();
  if (!tokens) {
    return null;
  }

  try {
    const restored = await restoreAndRefreshSession(tokens);
    if (restored.refreshed) {
      await writeSessionCookies(restored.session);
    }

    const account = await getCurrentAccount(restored.session);
    return { account };
  } catch {
    await clearSessionCookies();
    return null;
  }
}

export async function requireAuthenticatedAccount(nextPath = "/dashboard") {
  const result = await loadAuthenticatedAccount();
  if (!result) {
    redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  }

  return result;
}

export function expiredSessionError(): AppError {
  return new AppError("SESSION_EXPIRED");
}
