import { beforeEach, describe, expect, it, vi } from "vitest";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/session/constants";
import { PASSWORD_RECOVERY_ACCEPTED_MESSAGE } from "@/lib/recovery-message";
import { resetRateLimitForTests } from "@/lib/rate-limit";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === CSRF_COOKIE ? { value: "csrf-token" } : undefined,
  }),
}));

const requestPasswordRecovery = vi.fn();
const completePasswordRecovery = vi.fn();

vi.mock("@/lib/nakama/recovery", async () => {
  const actual = await vi.importActual<typeof import("@/lib/nakama/recovery")>(
    "@/lib/nakama/recovery",
  );
  return {
    ...actual,
    requestPasswordRecovery: (...args: unknown[]) =>
      requestPasswordRecovery(...args),
    completePasswordRecovery: (...args: unknown[]) =>
      completePasswordRecovery(...args),
  };
});

function makeRequest(path: string, body: unknown, origin = "https://account.xoranetwork.com") {
  return new Request(`https://account.xoranetwork.com${path}`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      [CSRF_HEADER]: "csrf-token",
    },
    body: JSON.stringify(body),
  });
}

describe("recovery HTTP handlers", () => {
  beforeEach(() => {
    resetRateLimitForTests();
    requestPasswordRecovery.mockReset();
    completePasswordRecovery.mockReset();
  });

  it("rejects a malformed email with JSON and does not call Nakama", async () => {
    const { forgotPasswordHandler } = await import("@/lib/http/recovery-handlers");
    const response = await forgotPasswordHandler(
      makeRequest("/api/auth/forgot-password", { email: "not-an-email" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_EMAIL");
    expect(requestPasswordRecovery).not.toHaveBeenCalled();
  });

  it("returns the same public message for an accepted request", async () => {
    requestPasswordRecovery.mockResolvedValue({ status: "accepted" });
    const { forgotPasswordHandler } = await import("@/lib/http/recovery-handlers");
    const response = await forgotPasswordHandler(
      makeRequest("/api/auth/forgot-password", {
        email: "player@xoranetwork.com",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: {
        accepted: true,
        message: PASSWORD_RECOVERY_ACCEPTED_MESSAGE,
      },
    });
  });

  it("returns JSON when Nakama is unavailable", async () => {
    const { AppError } = await import("@/lib/errors");
    requestPasswordRecovery.mockRejectedValue(new AppError("SERVER_UNAVAILABLE"));
    const { forgotPasswordHandler } = await import("@/lib/http/recovery-handlers");
    const response = await forgotPasswordHandler(
      makeRequest("/api/auth/forgot-password", {
        email: "player@xoranetwork.com",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("SERVER_UNAVAILABLE");
  });

  it("rejects a password mismatch with JSON", async () => {
    const { resetPasswordHandler } = await import("@/lib/http/recovery-handlers");
    const response = await resetPasswordHandler(
      makeRequest("/api/auth/reset-password", {
        token: "abc",
        password: "NewPass1",
        confirmPassword: "OtherPass1",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("PASSWORD_MISMATCH");
    expect(completePasswordRecovery).not.toHaveBeenCalled();
  });

  it("returns JSON for an invalid reset token", async () => {
    const { AppError } = await import("@/lib/errors");
    completePasswordRecovery.mockRejectedValue(new AppError("INVALID_RESET_TOKEN"));
    const { resetPasswordHandler } = await import("@/lib/http/recovery-handlers");
    const response = await resetPasswordHandler(
      makeRequest("/api/auth/reset-password", {
        token: "abc",
        password: "NewPass1",
        confirmPassword: "NewPass1",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_RESET_TOKEN");
  });
});
