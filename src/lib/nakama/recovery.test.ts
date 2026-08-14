import { createHmac, createHash } from "node:crypto";
import { Session } from "@heroiclabs/nakama-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMailConfigured, setMailSenderForTests } from "@/lib/mail/send";
import type { NakamaGateway } from "@/lib/nakama/client";
import {
  changeCurrentPassword,
  completePasswordRecovery,
  hashRecoveryToken,
  requestPasswordRecovery,
} from "@/lib/nakama/recovery";
import { resetUsernameIndexForTests } from "@/lib/nakama/username-index";
import {
  PASSWORD_RECOVERY_ACCEPTED_MESSAGE,
  RECOVERY_CONFIRM_RPC,
  RECOVERY_REQUEST_RPC,
} from "@/lib/recovery-message";

function jwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

function makeSession(username = "player_one", userId = "user-1") {
  const now = Math.floor(Date.now() / 1000);
  return new Session(
    jwt({ exp: now + 3600, usn: username, uid: userId }),
    jwt({ exp: now + 86400 }),
    false,
  );
}

type TokenRecord = { userId: string; exp: number; used: boolean };

function expectedSignature(message: string): string {
  return createHmac("sha256", process.env.XORA_RECOVERY_SECRET ?? "")
    .update(message)
    .digest("hex");
}

function luaLikeRecovery(
  accounts: Map<string, string>,
  tokens: Map<string, TokenRecord>,
  passwords: Map<string, string>,
) {
  return async (_httpKey: string, id: string, payload?: object) => {
    const body = (payload ?? {}) as {
      email?: string;
      tokenHash?: string;
      exp?: number;
      password?: string;
      signature?: string;
    };

    if (id === RECOVERY_REQUEST_RPC) {
      const email = body.email ?? "";
      const tokenHash = body.tokenHash ?? "";
      const exp = body.exp ?? 0;
      const message = `${RECOVERY_REQUEST_RPC}:${email}:${tokenHash}:${exp}`;
      if (
        !email ||
        tokenHash.length !== 64 ||
        exp <= Date.now() ||
        body.signature !== expectedSignature(message)
      ) {
        return { payload: { created: false } };
      }

      const userId = accounts.get(email) ?? "";
      if (!userId) {
        return { payload: { created: false } };
      }

      tokens.set(tokenHash, { userId, exp, used: false });
      return { payload: { created: true } };
    }

    if (id === RECOVERY_CONFIRM_RPC) {
      const tokenHash = body.tokenHash ?? "";
      const password = body.password ?? "";
      const message = `${RECOVERY_CONFIRM_RPC}:${tokenHash}`;
      if (
        tokenHash.length !== 64 ||
        password.length < 8 ||
        body.signature !== expectedSignature(message)
      ) {
        return { payload: { ok: false } };
      }

      const record = tokens.get(tokenHash);
      if (!record || record.used || record.exp <= Date.now()) {
        return { payload: { ok: false } };
      }

      record.used = true;
      passwords.set(record.userId, password);
      return { payload: { ok: true } };
    }

    throw new Error("unknown rpc");
  };
}

function memoryClient(
  accounts: Map<string, string> = new Map(),
  tokens: Map<string, TokenRecord> = new Map(),
  passwords: Map<string, string> = new Map(),
  partial: Partial<NakamaGateway> = {},
): NakamaGateway & {
  tokens: Map<string, TokenRecord>;
  passwords: Map<string, string>;
} {
  const lookup = makeSession("xora_lookup", "lookup-1");
  const rpcHttpKey = vi.fn(luaLikeRecovery(accounts, tokens, passwords));
  return {
    authenticateEmail: vi.fn().mockResolvedValue(makeSession()),
    authenticateCustom: vi.fn().mockResolvedValue(lookup),
    sessionRefresh: vi.fn(),
    sessionLogout: vi.fn().mockResolvedValue(true),
    getAccount: vi.fn(),
    getUsers: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    listFriends: vi.fn(),
    addFriends: vi.fn(),
    deleteFriends: vi.fn(),
    writeStorageObjects: vi.fn(),
    readStorageObjects: vi.fn().mockResolvedValue({ objects: [] }),
    deleteStorageObjects: vi.fn(),
    linkCustom: vi.fn().mockResolvedValue(true),
    linkEmail: vi.fn().mockResolvedValue(true),
    listStorageObjects: vi.fn().mockResolvedValue({ objects: [] }),
    rpc: vi.fn(),
    rpcHttpKey,
    tokens,
    passwords,
    ...partial,
  };
}

describe("password recovery", () => {
  beforeEach(() => {
    resetUsernameIndexForTests();
    setMailSenderForTests(null);
  });

  it("stays unavailable until mail is configured", async () => {
    expect(isMailConfigured()).toBe(false);
    await expect(
      requestPasswordRecovery("player@xoranetwork.com", memoryClient()),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("accepts an unknown email without sending mail or revealing the account", async () => {
    const sent: string[] = [];
    setMailSenderForTests(async (message) => {
      sent.push(message.to);
    });

    await expect(
      requestPasswordRecovery("missing@xoranetwork.com", memoryClient()),
    ).resolves.toEqual({ status: "accepted" });
    expect(sent).toEqual([]);
  });

  it("emails a 15-minute reset link and updates the password through the confirm RPC", async () => {
    const accounts = new Map([["player@xoranetwork.com", "user-9"]]);
    const client = memoryClient(accounts);
    let text = "";
    setMailSenderForTests(async (message) => {
      text = message.text;
    });

    await expect(
      requestPasswordRecovery("player@xoranetwork.com", client),
    ).resolves.toEqual({ status: "accepted" });

    expect(text).toContain("https://account.xoranetwork.com/reset-password?token=");
    expect(text).toContain("15 minutes");
    expect(text).not.toContain("one hour");

    const match = text.match(/token=([^\s]+)/);
    expect(match?.[1]).toBeTruthy();
    const token = decodeURIComponent(match?.[1] ?? "");
    expect(createHash("sha256").update(token).digest("hex")).toBe(
      hashRecoveryToken(token),
    );

    expect(client.rpcHttpKey).toHaveBeenCalledWith(
      "test-http-key",
      RECOVERY_REQUEST_RPC,
      expect.objectContaining({
        email: "player@xoranetwork.com",
        tokenHash: hashRecoveryToken(token),
      }),
    );

    await completePasswordRecovery(token, "NewPass1", client);
    expect(client.passwords.get("user-9")).toBe("NewPass1");
    expect(client.rpcHttpKey).toHaveBeenCalledWith(
      "test-http-key",
      RECOVERY_CONFIRM_RPC,
      expect.objectContaining({
        tokenHash: hashRecoveryToken(token),
        password: "NewPass1",
      }),
    );
    expect(client.linkEmail).not.toHaveBeenCalled();
    expect(client.authenticateCustom).not.toHaveBeenCalled();
  });

  it("rejects an invalid reset token", async () => {
    await expect(
      completePasswordRecovery("not-a-real-token", "NewPass1", memoryClient()),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
  });

  it("rejects an expired token", async () => {
    const accounts = new Map([["player@xoranetwork.com", "user-9"]]);
    const client = memoryClient(accounts);
    let text = "";
    setMailSenderForTests(async (message) => {
      text = message.text;
    });

    await requestPasswordRecovery("player@xoranetwork.com", client);
    const token = decodeURIComponent(text.match(/token=([^\s]+)/)?.[1] ?? "");
    const record = client.tokens.get(hashRecoveryToken(token));
    expect(record).toBeTruthy();
    if (record) {
      record.exp = Date.now() - 1;
    }

    await expect(
      completePasswordRecovery(token, "NewPass1", client),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
  });

  it("rejects a reused token", async () => {
    const accounts = new Map([["player@xoranetwork.com", "user-9"]]);
    const client = memoryClient(accounts);
    let text = "";
    setMailSenderForTests(async (message) => {
      text = message.text;
    });

    await requestPasswordRecovery("player@xoranetwork.com", client);
    const token = decodeURIComponent(text.match(/token=([^\s]+)/)?.[1] ?? "");
    await completePasswordRecovery(token, "NewPass1", client);
    await expect(
      completePasswordRecovery(token, "OtherPass1", client),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
    expect(client.passwords.get("user-9")).toBe("NewPass1");
  });

  it("surfaces email provider failures instead of pretending a link was sent", async () => {
    const accounts = new Map([["player@xoranetwork.com", "user-9"]]);
    setMailSenderForTests(async () => {
      throw new Error("provider down");
    });

    await expect(
      requestPasswordRecovery("player@xoranetwork.com", memoryClient(accounts)),
    ).rejects.toMatchObject({ code: "PASSWORD_RECOVERY_UNAVAILABLE" });
  });

  it("surfaces Nakama unavailability instead of hanging or faking success", async () => {
    const client = memoryClient(
      new Map([["player@xoranetwork.com", "user-9"]]),
      new Map(),
      new Map(),
      {
        rpcHttpKey: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
      },
    );
    setMailSenderForTests(async () => {
      throw new Error("should not send");
    });

    await expect(
      requestPasswordRecovery("player@xoranetwork.com", client),
    ).rejects.toMatchObject({ code: "SERVER_UNAVAILABLE" });
  });

  it("does not authorize recovery with the public SERVER_KEY", async () => {
    const accounts = new Map([["player@xoranetwork.com", "user-9"]]);
    const client = memoryClient(accounts);
    setMailSenderForTests(async () => undefined);

    await requestPasswordRecovery("player@xoranetwork.com", client);
    const payload = (client.rpcHttpKey as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[2] as { signature?: string; email?: string; tokenHash?: string; exp?: number };
    const serverKeySignature = createHmac("sha256", "test-server-key")
      .update(
        `${RECOVERY_REQUEST_RPC}:${payload.email}:${payload.tokenHash}:${payload.exp}`,
      )
      .digest("hex");

    expect(payload.signature).toBeTruthy();
    expect(payload.signature).not.toBe(serverKeySignature);
    expect(payload.signature).toBe(
      expectedSignature(
        `${RECOVERY_REQUEST_RPC}:${payload.email}:${payload.tokenHash}:${payload.exp}`,
      ),
    );
  });

  it("keeps the public success copy stable", () => {
    expect(PASSWORD_RECOVERY_ACCEPTED_MESSAGE).toBe(
      "If an account exists for that email, a password-reset link has been sent.",
    );
  });

  it("changes the password after verifying the current one", async () => {
    const session = makeSession();
    const client = memoryClient();
    await changeCurrentPassword(
      session,
      "Correct1",
      "NewPass1",
      "player@xoranetwork.com",
      client,
    );
    expect(client.authenticateEmail).toHaveBeenCalledWith(
      "player@xoranetwork.com",
      "Correct1",
      false,
    );
    expect(client.linkEmail).toHaveBeenCalledWith(session, {
      email: "player@xoranetwork.com",
      password: "NewPass1",
    });
  });
});
