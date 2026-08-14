import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NakamaGateway } from "@/lib/nakama/client";
import {
  listNotifications,
  markNotificationsRead,
  pushNotification,
} from "@/lib/nakama/notifications";
import { resetUsernameIndexForTests } from "@/lib/nakama/username-index";
import { Session } from "@heroiclabs/nakama-js";

function jwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

function makeSession() {
  const now = Math.floor(Date.now() / 1000);
  return new Session(
    jwt({ exp: now + 3600, usn: "xora_lookup", uid: "lookup-1" }),
    jwt({ exp: now + 86400 }),
    true,
  );
}

function memoryClient(): NakamaGateway {
  const store = new Map<string, unknown>();
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
  };
}

describe("notifications", () => {
  beforeEach(() => {
    resetUsernameIndexForTests();
  });

  it("stores a friend request and counts it as unread", async () => {
    const client = memoryClient();
    await pushNotification(
      "player_one",
      {
        type: "friend_request",
        fromUsername: "other_player",
        fromDisplayName: "Other Player",
        body: "Other Player added you as a friend.",
        href: "/friends",
      },
      client,
    );

    const list = await listNotifications("player_one", [], client);
    expect(list.unreadCount).toBe(1);
    expect(list.items[0]?.type).toBe("friend_request");
    expect(list.items[0]?.fromUsername).toBe("other_player");
  });

  it("adds pending friend requests that are not already stored", async () => {
    const client = memoryClient();
    const list = await listNotifications(
      "player_one",
      [{ username: "incoming_user", displayName: "Incoming" }],
      client,
    );
    expect(list.unreadCount).toBe(1);
    expect(list.items[0]?.href).toBe("/friends");
  });

  it("marks stored and pending friend notifications as read", async () => {
    const client = memoryClient();
    await pushNotification(
      "player_one",
      {
        type: "message",
        fromUsername: "ally",
        fromDisplayName: "Ally",
        body: "Ally: hello",
        href: "/messages/ally",
      },
      client,
    );

    const listed = await markNotificationsRead(
      "player_one",
      { all: true },
      [{ username: "incoming_user", displayName: "Incoming" }],
      client,
    );
    expect(listed.unreadCount).toBe(0);
    expect(listed.items.every((item) => item.read)).toBe(true);
  });
});
