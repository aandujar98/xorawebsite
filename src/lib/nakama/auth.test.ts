import { Session } from "@heroiclabs/nakama-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { loginWithEmail, registerWithEmail, signOutSession } from "@/lib/nakama/auth";
import type { NakamaGateway } from "@/lib/nakama/client";
import { resetUsernameIndexForTests } from "@/lib/nakama/username-index";

function jwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

function makeSession(created = false, username = "player_one") {
  const now = Math.floor(Date.now() / 1000);
  return new Session(
    jwt({ exp: now + 3600, usn: username, uid: "user-1" }),
    jwt({ exp: now + 86400 }),
    created,
  );
}

function mockClient(partial: Partial<NakamaGateway> = {}): NakamaGateway {
  return {
    authenticateEmail: vi.fn(),
    authenticateCustom: vi.fn().mockResolvedValue(makeSession(true, "xora_lookup")),
    sessionRefresh: vi.fn(),
    sessionLogout: vi.fn().mockResolvedValue(true),
    getAccount: vi.fn(),
    getUsers: vi.fn(),
    updateAccount: vi.fn().mockResolvedValue(true),
    deleteAccount: vi.fn().mockResolvedValue(true),
    listFriends: vi.fn().mockResolvedValue({ friends: [] }),
    addFriends: vi.fn().mockResolvedValue(true),
    deleteFriends: vi.fn().mockResolvedValue(true),
    writeStorageObjects: vi.fn().mockResolvedValue({}),
    readStorageObjects: vi.fn().mockResolvedValue({ objects: [] }),
    deleteStorageObjects: vi.fn().mockResolvedValue(true),
    linkCustom: vi.fn().mockResolvedValue(true),
    linkEmail: vi.fn().mockResolvedValue(true),
    listStorageObjects: vi.fn().mockResolvedValue({ objects: [] }),
    rpc: vi.fn(),
    rpcHttpKey: vi.fn(),
    ...partial,
  };
}

const registerInput = {
  email: "player@xoranetwork.com",
  username: "player_one",
  displayName: "Player One",
  password: "Correct1",
};

describe("authentication", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetUsernameIndexForTests();
  });

  it("registers with account creation explicitly enabled", async () => {
    const session = makeSession(true);
    const client = mockClient({
      authenticateEmail: vi.fn().mockResolvedValue(session),
    });

    const result = await registerWithEmail(registerInput, client);

    expect(client.authenticateEmail).toHaveBeenCalledWith(
      registerInput.email,
      registerInput.password,
      true,
      registerInput.username,
    );
    expect(client.updateAccount).toHaveBeenCalledWith(session, {
      display_name: registerInput.displayName,
    });
    expect(result).toBe(session);
  });

  it("does not treat an existing-account login as registration", async () => {
    const session = makeSession(false);
    const client = mockClient({
      authenticateEmail: vi.fn().mockResolvedValue(session),
    });

    await expect(registerWithEmail(registerInput, client)).rejects.toMatchObject({
      code: "EMAIL_REGISTERED",
    });
    expect(client.sessionLogout).toHaveBeenCalled();
  });

  it("logs in with account creation explicitly disabled", async () => {
    const session = makeSession(false);
    const client = mockClient({
      authenticateEmail: vi.fn().mockResolvedValue(session),
    });

    const result = await loginWithEmail(
      {
        identifier: registerInput.email,
        password: registerInput.password,
        rememberMe: true,
      },
      client,
    );

    expect(client.authenticateEmail).toHaveBeenCalledWith(
      registerInput.email,
      registerInput.password,
      false,
    );
    expect(client.authenticateCustom).not.toHaveBeenCalled();
    expect(result).toBe(session);
  });

  it("logs in with a username by resolving it to email", async () => {
    const session = makeSession(false);
    const client = mockClient({
      authenticateEmail: vi.fn().mockResolvedValue(session),
      readStorageObjects: vi.fn().mockResolvedValue({
        objects: [{ value: { email: registerInput.email } }],
      }),
    });

    const result = await loginWithEmail(
      {
        identifier: "Player_One",
        password: registerInput.password,
        rememberMe: true,
      },
      client,
    );

    expect(client.readStorageObjects).toHaveBeenCalled();
    expect(client.authenticateEmail).toHaveBeenCalledWith(
      registerInput.email,
      registerInput.password,
      false,
    );
    expect(result).toBe(session);
  });

  it("does not reveal whether an unknown username exists", async () => {
    const client = mockClient({
      authenticateEmail: vi.fn(),
      readStorageObjects: vi.fn().mockResolvedValue({ objects: [] }),
    });

    await expect(
      loginWithEmail(
        {
          identifier: "missing_user",
          password: registerInput.password,
          rememberMe: false,
        },
        client,
      ),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(client.authenticateEmail).not.toHaveBeenCalled();
  });

  it("maps invalid credentials to a friendly error", async () => {
    const client = mockClient({
      authenticateEmail: vi.fn().mockRejectedValue(
        new Response(JSON.stringify({ message: "Invalid credentials." }), {
          status: 401,
        }),
      ),
    });

    await expect(
      loginWithEmail(
        {
          identifier: registerInput.email,
          password: "WrongPass1",
          rememberMe: false,
        },
        client,
      ),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      loginWithEmail(
        {
          identifier: registerInput.email,
          password: "WrongPass1",
          rememberMe: false,
        },
        client,
      ),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("signs out by invalidating the Nakama session", async () => {
    const session = makeSession();
    const client = mockClient();

    await signOutSession(session, client);

    expect(client.sessionLogout).toHaveBeenCalledWith(
      session,
      session.token,
      session.refresh_token,
    );
  });
});
