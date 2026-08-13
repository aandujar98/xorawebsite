import { describe, expect, it } from "vitest";
import { AUTH_RATE_LIMIT, checkRateLimit, resetRateLimitForTests } from "@/lib/rate-limit";
import {
  PASSWORD_RECOVERY_ENABLED,
  requestPasswordRecovery,
} from "@/lib/auth/password-recovery";

describe("rate limiting", () => {
  it("blocks a key after the window limit is reached", () => {
    resetRateLimitForTests();
    const now = 1_000_000;

    for (let index = 0; index < AUTH_RATE_LIMIT.limit; index += 1) {
      expect(checkRateLimit("login:1.1.1.1", AUTH_RATE_LIMIT, now).allowed).toBe(true);
    }

    expect(checkRateLimit("login:1.1.1.1", AUTH_RATE_LIMIT, now).allowed).toBe(false);
  });
});

describe("password recovery", () => {
  it("stays unavailable until an email workflow exists", async () => {
    expect(PASSWORD_RECOVERY_ENABLED).toBe(false);
    await expect(requestPasswordRecovery("player@xoranetwork.com")).resolves.toEqual({
      status: "unavailable",
    });
  });
});
