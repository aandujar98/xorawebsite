import { Session } from "@heroiclabs/nakama-js";
import { AppError } from "@/lib/errors";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import type { SessionTokens } from "@/types/account";

const REFRESH_BUFFER_SECONDS = 10;

export function restoreSessionFromTokens(tokens: SessionTokens): Session {
  try {
    return Session.restore(tokens.token, tokens.refreshToken);
  } catch {
    throw new AppError("SESSION_EXPIRED");
  }
}

export function sessionNeedsRefresh(
  session: Session,
  nowSeconds = Date.now() / 1000,
): boolean {
  return session.isexpired(nowSeconds + REFRESH_BUFFER_SECONDS);
}

export function sessionCanBeRestored(
  session: Session,
  nowSeconds = Date.now() / 1000,
): boolean {
  return !session.isrefreshexpired(nowSeconds);
}

export async function restoreAndRefreshSession(
  tokens: SessionTokens,
  client: NakamaGateway = getNakamaClient(),
): Promise<{ session: Session; refreshed: boolean }> {
  const session = restoreSessionFromTokens(tokens);
  const nowSeconds = Date.now() / 1000;

  if (!sessionCanBeRestored(session, nowSeconds)) {
    throw new AppError("SESSION_EXPIRED");
  }

  if (!sessionNeedsRefresh(session, nowSeconds)) {
    return { session, refreshed: false };
  }

  try {
    const refreshed = await withNakamaErrors(() => client.sessionRefresh(session));
    return { session: refreshed, refreshed: true };
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_CREDENTIALS") {
      throw new AppError("SESSION_EXPIRED");
    }
    throw error;
  }
}
