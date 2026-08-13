import { Session } from "@heroiclabs/nakama-js";
import { describe, expect, it, vi } from "vitest";
import {
  restoreAndRefreshSession,
  restoreSessionFromTokens,
  sessionCanBeRestored,
  sessionNeedsRefresh,
} from "@/lib/session/restore";
import type { NakamaGateway } from "@/lib/nakama/client";

function jwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

function tokens(accessExpOffset: number, refreshExpOffset: number) {
  const now = Math.floor(Date.now() / 1000);
  return {
    token: jwt({ exp: now + accessExpOffset, usn: "player_one", uid: "user-1" }),
    refreshToken: jwt({ exp: now + refreshExpOffset }),
  };
}

describe("session restoration", () => {
  it("restores a valid session without refreshing", async () => {
    const sessionTokens = tokens(3600, 86400);
    const restored = restoreSessionFromTokens(sessionTokens);
    expect(sessionNeedsRefresh(restored, Date.now() / 1000)).toBe(false);
    expect(sessionCanBeRestored(restored, Date.now() / 1000)).toBe(true);

    const client = { sessionRefresh: vi.fn() } as unknown as NakamaGateway;
    const result = await restoreAndRefreshSession(sessionTokens, client);
    expect(result.refreshed).toBe(false);
    expect(client.sessionRefresh).not.toHaveBeenCalled();
  });

  it("refreshes a session that is close to expiry", async () => {
    const sessionTokens = tokens(5, 86400);
    const next = new Session(sessionTokens.token, sessionTokens.refreshToken, false);
    const client = {
      sessionRefresh: vi.fn().mockResolvedValue(next),
    } as unknown as NakamaGateway;

    const result = await restoreAndRefreshSession(sessionTokens, client);
    expect(result.refreshed).toBe(true);
    expect(client.sessionRefresh).toHaveBeenCalled();
  });

  it("rejects an expired refresh token", async () => {
    const sessionTokens = tokens(-10, -10);
    const client = { sessionRefresh: vi.fn() } as unknown as NakamaGateway;

    await expect(restoreAndRefreshSession(sessionTokens, client)).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
  });
});
