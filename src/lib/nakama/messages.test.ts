import { Session } from "@heroiclabs/nakama-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NakamaGateway } from "@/lib/nakama/client";
import { sendDirectMessage } from "@/lib/nakama/messages";
import { resetUsernameIndexForTests } from "@/lib/nakama/username-index";

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

function memoryClient(partial: Partial<NakamaGateway> = {}): NakamaGateway {
  const store = new Map<string, unknown>();
  const lookup = makeSession("xora_lookup");
  return {
    authenticateEmail: vi.fn(),
    authenticateCustom: vi.fn().mockResolvedValue(lookup),
    sessionRefresh: vi.fn(),
    sessionLogout: vi.fn(),
    getAccount: vi.fn().mockResolvedValue({
      user: { id: "user-1", username: "player_one", display_name: "Player One" },
    }),
    getUsers: vi.fn().mockResolvedValue({
      users: [{ id: "user-2", username: "other_player", display_name: "Other" }],
    }),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    listFriends: vi.fn().mockResolvedValue({
      friends: [{ state: 0, user: { username: "other_player", display_name: "Other" } }],
    }),
    addFriends: vi.fn(),
    deleteFriends: vi.fn(),
    writeStorageObjects: vi.fn(async (_session, objects) => {
      for (const object of objects) {
        store.set(`${object.collection}:${object.key}`, object.value);
      }
      return {};
    }),
    readStorageObjects: vi.fn(
      async (
        _session,
        request: {
          object_ids?: Array<{ collection?: string; key?: string }>;
        },
      ) => ({
        objects: (request.object_ids ?? [])
          .map((id: { collection?: string; key?: string }) => ({
            collection: id.collection,
            key: id.key,
            value: store.get(`${id.collection}:${id.key}`),
          }))
          .filter((object: { value: unknown }) => object.value !== undefined),
      }),
    ),
    deleteStorageObjects: vi.fn().mockResolvedValue(true),
    linkCustom: vi.fn(),
    linkEmail: vi.fn(),
    listStorageObjects: vi.fn().mockResolvedValue({ objects: [] }),
    rpc: vi.fn(),
    rpcHttpKey: vi.fn(),
    ...partial,
  };
}

describe("direct messages", () => {
  beforeEach(() => {
    resetUsernameIndexForTests();
  });

  it("sends a message to a friend and notifies them", async () => {
    const client = memoryClient();
    const thread = await sendDirectMessage(
      makeSession(),
      "other_player",
      "Want to play?",
      client,
    );

    expect(thread.username).toBe("other_player");
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0]?.body).toBe("Want to play?");
    expect(client.writeStorageObjects).toHaveBeenCalled();
  });

  it("does not allow messaging someone who is not a friend", async () => {
    const client = memoryClient({
      listFriends: vi.fn().mockResolvedValue({ friends: [] }),
    });

    await expect(
      sendDirectMessage(makeSession(), "other_player", "Hello", client),
    ).rejects.toMatchObject({ code: "NOT_FRIENDS" });
  });
});
