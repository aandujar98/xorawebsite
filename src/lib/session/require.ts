import { AppError } from "@/lib/errors";
import {
  readSessionTokens,
  writeSessionCookies,
} from "@/lib/session/cookies";
import { restoreAndRefreshSession } from "@/lib/session/restore";

export async function requireRestoredSession() {
  const tokens = await readSessionTokens();
  if (!tokens) {
    throw new AppError("SESSION_EXPIRED");
  }

  const restored = await restoreAndRefreshSession(tokens);
  if (restored.refreshed) {
    await writeSessionCookies(restored.session);
  }

  return restored.session;
}
