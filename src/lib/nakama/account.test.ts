import { Session } from "@heroiclabs/nakama-js";
import { describe, expect, it, vi } from "vitest";
import { deleteCurrentAccount, getProfileByUsername, toPublicAccount, updateCurrentProfile } from "@/lib/nakama/account";
import type { NakamaGateway } from "@/lib/nakama/client";

function jwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

function makeSession(username = "player_one") {
  const now = Math.floor(Date.now() / 1000);
  return new Session(
    jwt({ exp: now + 3600, usn: username, uid: "user-1" }),
    jwt({ exp: now + 86400 }),
    false,
  );
}

describe("account mapping and profile updates", () => {
  it("does not claim email verification", () => {
    const account = toPublicAccount({
      email: "player@xoranetwork.com",
      verify_time: "2026-01-01T00:00:00Z",
      user: {
        id: "user-1",
        username: "player_one",
        display_name: "Player One",
        create_time: "2026-01-01T00:00:00Z",
        online: true,
      },
    } as never);

    expect(account.emailVerified).toBe(false);
    expect(account.displayName).toBe("Player One");
    expect(account.id).toBe("player_one");
    expect(account.id).toBe(account.username);
  });

  it("updates a profile and refreshes the session after a username change", async () => {
    const session = makeSession("old_name");
    const refreshed = makeSession("new_name");
    const currentAccount = {
      email: "player@xoranetwork.com",
      user: {
        id: "user-1",
        username: "old_name",
        display_name: "Old",
        avatar_url: "",
      },
    };
    const updatedAccount = {
      email: "player@xoranetwork.com",
      user: {
        id: "user-1",
        username: "new_name",
        display_name: "New Player",
        avatar_url: "https://cdn.xoranetwork.com/a.png",
      },
    };

    const client: NakamaGateway = {
      authenticateEmail: vi.fn(),
      sessionRefresh: vi.fn().mockResolvedValue(refreshed),
      sessionLogout: vi.fn(),
      getAccount: vi
        .fn()
        .mockResolvedValueOnce(currentAccount)
        .mockResolvedValueOnce(updatedAccount),
      getUsers: vi.fn(),
      updateAccount: vi.fn().mockResolvedValue(true),
      deleteAccount: vi.fn(),
    };

    const result = await updateCurrentProfile(
      session,
      {
        displayName: "New Player",
        username: "new_name",
        avatarUrl: "https://cdn.xoranetwork.com/a.png",
        location: "Earth",
      },
      client,
    );

    expect(client.updateAccount).toHaveBeenCalled();
    expect(client.sessionRefresh).toHaveBeenCalledWith(session);
    expect(result.usernameChanged).toBe(true);
    expect(result.account.username).toBe("new_name");
    expect(result.account.id).toBe("new_name");
    expect(result.session).toBe(refreshed);
  });

  it("deletes the current account", async () => {
    const session = makeSession();
    const client: NakamaGateway = {
      authenticateEmail: vi.fn(),
      sessionRefresh: vi.fn(),
      sessionLogout: vi.fn(),
      getAccount: vi.fn(),
      getUsers: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn().mockResolvedValue(true),
    };

    await deleteCurrentAccount(session, client);
    expect(client.deleteAccount).toHaveBeenCalledWith(session);
  });

  it("loads a public profile by username", async () => {
    const session = makeSession();
    const client: NakamaGateway = {
      authenticateEmail: vi.fn(),
      sessionRefresh: vi.fn(),
      sessionLogout: vi.fn(),
      getAccount: vi.fn(),
      getUsers: vi.fn().mockResolvedValue({
        users: [
          {
            id: "user-2",
            username: "other_player",
            display_name: "Other Player",
            location: "Orbit",
            online: true,
          },
        ],
      }),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
    };

    const profile = await getProfileByUsername(session, "other_player", client);
    expect(profile.username).toBe("other_player");
    expect(profile.id).toBe("other_player");
    expect(profile.displayName).toBe("Other Player");
    expect(profile.location).toBe("Orbit");
  });

  it("returns not found when the username does not exist", async () => {
    const session = makeSession();
    const client: NakamaGateway = {
      authenticateEmail: vi.fn(),
      sessionRefresh: vi.fn(),
      sessionLogout: vi.fn(),
      getAccount: vi.fn(),
      getUsers: vi.fn().mockResolvedValue({ users: [] }),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
    };

    await expect(getProfileByUsername(session, "missing", client)).rejects.toMatchObject({
      code: "PROFILE_NOT_FOUND",
    });
  });
});
