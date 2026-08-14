import { randomBytes } from "node:crypto";
import type {
  AccountNotification,
  FriendEntry,
  NotificationList,
  NotificationType,
} from "@/types/account";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import {
  deleteLookupObject,
  readLookupObject,
  writeLookupObject,
} from "@/lib/nakama/lookup-store";

export const NOTIFICATION_COLLECTION = "xora_notifications";
const MAX_ITEMS = 40;

function inboxKey(username: string): string {
  return `inbox:${username.trim().toLowerCase()}`;
}

function asNotifications(value: unknown): AccountNotification[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    const type = record.type;
    if (type !== "friend_request" && type !== "message") {
      return [];
    }
    if (
      typeof record.id !== "string" ||
      typeof record.fromUsername !== "string" ||
      typeof record.body !== "string" ||
      typeof record.href !== "string" ||
      typeof record.createdAt !== "string"
    ) {
      return [];
    }
    return [
      {
        id: record.id,
        type,
        fromUsername: record.fromUsername,
        fromDisplayName:
          typeof record.fromDisplayName === "string"
            ? record.fromDisplayName
            : record.fromUsername,
        body: record.body,
        href: record.href,
        createdAt: record.createdAt,
        read: Boolean(record.read),
      },
    ];
  });
}

async function saveInbox(
  username: string,
  items: AccountNotification[],
  client: NakamaGateway,
): Promise<void> {
  await writeLookupObject(
    NOTIFICATION_COLLECTION,
    inboxKey(username),
    { items: items.slice(0, MAX_ITEMS) },
    client,
  );
}

export async function pushNotification(
  username: string,
  input: {
    type: NotificationType;
    fromUsername: string;
    fromDisplayName: string;
    body: string;
    href: string;
  },
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  const items = asNotifications(
    await readLookupObject(NOTIFICATION_COLLECTION, inboxKey(username), client),
  );
  const next: AccountNotification = {
    id: randomBytes(12).toString("hex"),
    type: input.type,
    fromUsername: input.fromUsername,
    fromDisplayName: input.fromDisplayName,
    body: input.body,
    href: input.href,
    createdAt: new Date().toISOString(),
    read: false,
  };
  await saveInbox(username, [next, ...items], client);
}

export async function listNotifications(
  username: string,
  incoming: Pick<FriendEntry, "username" | "displayName">[] = [],
  client: NakamaGateway = getNakamaClient(),
): Promise<NotificationList> {
  const stored = asNotifications(
    await readLookupObject(NOTIFICATION_COLLECTION, inboxKey(username), client),
  );

  const items = [...stored];
  for (const request of incoming) {
    const exists = items.some(
      (item) =>
        item.type === "friend_request" &&
        item.fromUsername.toLowerCase() === request.username.toLowerCase(),
    );
    if (!exists) {
      items.push({
        id: `friend:${request.username.toLowerCase()}`,
        type: "friend_request",
        fromUsername: request.username,
        fromDisplayName: request.displayName,
        body: `${request.displayName} added you as a friend.`,
        href: "/friends",
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  }

  items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
  };
}

export async function markNotificationsRead(
  username: string,
  input: { ids?: string[]; all?: boolean },
  incoming: Pick<FriendEntry, "username" | "displayName">[] = [],
  client: NakamaGateway = getNakamaClient(),
): Promise<NotificationList> {
  const listed = await listNotifications(username, incoming, client);
  const ids = new Set((input.ids ?? []).map((id) => id.toLowerCase()));
  const next = listed.items.map((item) => {
    if (input.all || ids.has(item.id.toLowerCase())) {
      return { ...item, read: true };
    }
    return item;
  });
  await saveInbox(username, next, client);
  return {
    items: next,
    unreadCount: next.filter((item) => !item.read).length,
  };
}

export async function migrateNotificationInbox(
  oldUsername: string,
  newUsername: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  if (oldUsername.trim().toLowerCase() === newUsername.trim().toLowerCase()) {
    return;
  }

  const items = asNotifications(
    await readLookupObject(NOTIFICATION_COLLECTION, inboxKey(oldUsername), client),
  );
  if (items.length > 0) {
    await saveInbox(newUsername, items, client);
  }
  await deleteLookupObject(NOTIFICATION_COLLECTION, inboxKey(oldUsername), client).catch(
    () => undefined,
  );
}
