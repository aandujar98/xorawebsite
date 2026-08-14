import { Session } from "@heroiclabs/nakama-js";
import { describe, expect, it, vi } from "vitest";
import { addFriendByUsername, listCurrentFriends } from "@/lib/nakama/friends";
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

function mockClient(partial: Partial<NakamaGateway> = {}): NakamaGateway {
  return {
    authenticateEmail: vi.fn(),
    authenticateCustom: vi.fn(),
    sessionRefresh: vi.fn(),
    sessionLogout: vi.fn(),
    getAccount: vi.fn().mockResolvedValue({
      user: { id: "user-1", username: "player_one" },
    }),
    getUsers: vi.fn().mockResolvedValue({
      users: [{ id: "user-2", username: "other_player", display_name: "Other" }],
    }),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    listFriends: vi.fn().mockResolvedValue({ friends: [] }),
    addFriends: vi.fn().mockResolvedValue(true),
    deleteFriends: vi.fn().mockResolvedValue(true),
    writeStorageObjects: vi.fn(),
    readStorageObjects: vi.fn(),
    deleteStorageObjects: vi.fn(),
    linkCustom: vi.fn().mockResolvedValue(true),
    linkEmail: vi.fn().mockResolvedValue(true),
    listStorageObjects: vi.fn().mockResolvedValue({ objects: [] }),
    rpc: vi.fn(),
    rpcHttpKey: vi.fn(),
    ...partial,
  };
}

describe("friends", () => {
  it("groups Nakama friend states into friends, incoming, and outgoing", async () => {
    const client = mockClient({
      listFriends: vi.fn().mockResolvedValue({
        friends: [
          { state: 0, user: { username: "ally", display_name: "Ally" } },
          { state: 1, user: { username: "pending", display_name: "Pending" } },
          { state: 2, user: { username: "incoming", display_name: "Incoming" } },
          { state: 3, user: { username: "blocked", display_name: "Blocked" } },
        ],
      }),
    });

    const list = await listCurrentFriends(makeSession(), client);
    expect(list.friends.map((entry) => entry.username)).toEqual(["ally"]);
    expect(list.outgoing.map((entry) => entry.username)).toEqual(["pending"]);
    expect(list.incoming.map((entry) => entry.username)).toEqual(["incoming"]);
  });

  it("does not allow adding yourself", async () => {
    await expect(
      addFriendByUsername(makeSession(), "player_one", mockClient()),
    ).rejects.toMatchObject({ code: "CANNOT_ADD_SELF" });
  });

  it("sends a friend request using the stored username, ignoring typed case", async () => {
    const session = makeSession();
    const client = mockClient({
      getUsers: vi.fn().mockImplementation(async (_session, _ids, usernames?: string[]) => {
        const hit = usernames?.some((name) => name.toLowerCase() === "other_player");
        return hit
          ? { users: [{ id: "user-2", username: "other_player", display_name: "Other" }] }
          : { users: [] };
      }),
    });

    await addFriendByUsername(session, "Other_Player", client);
    expect(client.getUsers).toHaveBeenCalledWith(session, undefined, [
      "Other_Player",
      "other_player",
    ]);
    expect(client.addFriends).toHaveBeenCalledWith(session, undefined, ["other_player"]);
  });
});
