import { Session } from "@heroiclabs/nakama-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NakamaGateway } from "@/lib/nakama/client";
import {
  forgetUsernameEmail,
  rememberUsernameEmail,
  resetUsernameIndexForTests,
  resolveAccountForEmail,
  resolveEmailForUsername,
  USERNAME_INDEX_COLLECTION,
} from "@/lib/nakama/username-index";

function jwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

function makeSession(username = "xora_lookup") {
  const now = Math.floor(Date.now() / 1000);
  return new Session(
    jwt({ exp: now + 3600, usn: username, uid: "lookup-1" }),
    jwt({ exp: now + 86400 }),
    true,
  );
}

function mockClient(partial: Partial<NakamaGateway> = {}): NakamaGateway {
  return {
    authenticateEmail: vi.fn(),
    authenticateCustom: vi.fn().mockResolvedValue(makeSession()),
    sessionRefresh: vi.fn(),
    sessionLogout: vi.fn(),
    getAccount: vi.fn(),
    getUsers: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    listFriends: vi.fn(),
    addFriends: vi.fn(),
    deleteFriends: vi.fn(),
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

describe("username email index", () => {
  beforeEach(() => {
    resetUsernameIndexForTests();
  });

  it("stores email against a lowercase username key", async () => {
    const client = mockClient();

    await rememberUsernameEmail("Player_One", "Player@XoraNetwork.com", client);

    expect(client.writeStorageObjects).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          collection: USERNAME_INDEX_COLLECTION,
          key: "user:player_one",
          value: { email: "player@xoranetwork.com", userId: "", customId: "" },
        }),
        expect.objectContaining({
          collection: USERNAME_INDEX_COLLECTION,
          key: "email:player@xoranetwork.com",
          value: {
            username: "Player_One",
            userId: "",
            email: "player@xoranetwork.com",
            customId: "",
          },
        }),
      ]),
    );
  });

  it("resolves a username case-insensitively", async () => {
    const client = mockClient({
      readStorageObjects: vi.fn().mockResolvedValue({
        objects: [{ value: { email: "player@xoranetwork.com" } }],
      }),
    });

    await expect(resolveEmailForUsername("PLAYER_ONE", client)).resolves.toBe(
      "player@xoranetwork.com",
    );
  });

  it("returns null when the username is not indexed", async () => {
    const client = mockClient();
    await expect(resolveEmailForUsername("missing", client)).resolves.toBeNull();
  });

  it("deletes the old username key", async () => {
    const client = mockClient();
    await forgetUsernameEmail("Old_Name", client);
    expect(client.deleteStorageObjects).toHaveBeenCalledWith(
      expect.anything(),
      {
        object_ids: [
          {
            collection: USERNAME_INDEX_COLLECTION,
            key: "user:old_name",
          },
        ],
      },
    );
  });

  it("finds an account by scanning username keys when the email key is missing", async () => {
    const client = mockClient({
      listStorageObjects: vi.fn().mockResolvedValue({
        objects: [
          {
            key: "user:player_one",
            value: { email: "player@xoranetwork.com", userId: "user-1" },
          },
        ],
      }),
    });

    await expect(
      resolveAccountForEmail("Player@XoraNetwork.com", client),
    ).resolves.toEqual({
      email: "player@xoranetwork.com",
      username: "player_one",
      userId: "user-1",
      customId: "",
    });
  });
});
