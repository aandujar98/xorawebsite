import { createHash } from "node:crypto";
import type { Session } from "@heroiclabs/nakama-js";
import { getNakamaServerConfig } from "@/lib/env";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import { sessionNeedsRefresh } from "@/lib/session/restore";

export const USERNAME_INDEX_COLLECTION = "xora_username_index";
export const USERNAME_INDEX_KEY_PREFIX = "user:";
export const EMAIL_INDEX_KEY_PREFIX = "email:";

let lookupSession: Session | null = null;

function lookupCustomId(): string {
  return createHash("sha256")
    .update(`xora-website-lookup:${getNakamaServerConfig().serverKey}`)
    .digest("hex");
}

function lookupUsername(): string {
  return `xora_${lookupCustomId().slice(0, 12)}`;
}

function indexKey(username: string): string {
  return `${USERNAME_INDEX_KEY_PREFIX}${username.trim().toLowerCase()}`;
}

function emailIndexKey(email: string): string {
  return `${EMAIL_INDEX_KEY_PREFIX}${email.trim().toLowerCase()}`;
}

export async function getLookupSession(
  client: NakamaGateway,
): Promise<Session> {
  if (lookupSession && !sessionNeedsRefresh(lookupSession)) {
    return lookupSession;
  }

  if (lookupSession) {
    try {
      lookupSession = await withNakamaErrors(() =>
        client.sessionRefresh(lookupSession as Session),
      );
      return lookupSession;
    } catch {
      lookupSession = null;
    }
  }

  lookupSession = await withNakamaErrors(() =>
    client.authenticateCustom(lookupCustomId(), true, lookupUsername()),
  );
  return lookupSession;
}

export function resetUsernameIndexForTests() {
  lookupSession = null;
}

export async function rememberUsernameEmail(
  username: string,
  email: string,
  client: NakamaGateway = getNakamaClient(),
  userId = "",
  customId = "",
): Promise<void> {
  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedUsername || !trimmedEmail) {
    return;
  }

  const session = await getLookupSession(client);
  const objects = [
    {
      collection: USERNAME_INDEX_COLLECTION,
      key: indexKey(trimmedUsername),
      value: { email: trimmedEmail, userId, customId },
      permission_read: 1,
      permission_write: 1,
    },
    {
      collection: USERNAME_INDEX_COLLECTION,
      key: emailIndexKey(trimmedEmail),
      value: { username: trimmedUsername, userId, email: trimmedEmail, customId },
      permission_read: 1,
      permission_write: 1,
    },
  ];
  await withNakamaErrors(() => client.writeStorageObjects(session, objects));
}

export async function forgetUsernameEmail(
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return;
  }

  const session = await getLookupSession(client);
  await withNakamaErrors(() =>
    client.deleteStorageObjects(session, {
      object_ids: [
        {
          collection: USERNAME_INDEX_COLLECTION,
          key: indexKey(trimmedUsername),
        },
      ],
    }),
  );
}

export async function resolveEmailForUsername(
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<string | null> {
  const session = await getLookupSession(client);
  const stored = await withNakamaErrors(() =>
    client.readStorageObjects(session, {
      object_ids: [
        {
          collection: USERNAME_INDEX_COLLECTION,
          key: indexKey(username),
          user_id: session.user_id,
        },
      ],
    }),
  );

  const value = stored.objects?.[0]?.value;
  if (!value || typeof value !== "object") {
    return null;
  }

  const email = (value as { email?: unknown }).email;
  return typeof email === "string" && email.includes("@") ? email : null;
}

export type IndexedAccount = {
  email: string;
  username: string;
  userId: string;
  customId: string;
};

export async function resolveAccountForEmail(
  email: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<IndexedAccount | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return null;
  }

  const session = await getLookupSession(client);
  const stored = await withNakamaErrors(() =>
    client.readStorageObjects(session, {
      object_ids: [
        {
          collection: USERNAME_INDEX_COLLECTION,
          key: emailIndexKey(normalized),
          user_id: session.user_id,
        },
      ],
    }),
  );

  const value = stored.objects?.[0]?.value;
  const direct = await withUserId(
    parseIndexedAccount(value, normalized),
    session,
    client,
  );
  if (direct) {
    return direct;
  }

  let cursor: string | undefined;
  do {
    const page = await withNakamaErrors(() =>
      client.listStorageObjects(
        session,
        USERNAME_INDEX_COLLECTION,
        session.user_id,
        100,
        cursor,
      ),
    );
    for (const object of page.objects ?? []) {
      const found = await withUserId(
        parseIndexedAccount(object.value, normalized, object.key),
        session,
        client,
      );
      if (found) {
        return found;
      }
    }
    cursor = page.cursor;
  } while (cursor);

  return null;
}

async function withUserId(
  found: IndexedAccount | null,
  session: Session,
  client: NakamaGateway,
): Promise<IndexedAccount | null> {
  if (!found) {
    return null;
  }
  if (found.userId) {
    return found;
  }

  const result = await withNakamaErrors(() =>
    client.getUsers(session, undefined, [found.username]),
  );
  const match =
    result.users?.find(
      (user) => user.username?.toLowerCase() === found.username.toLowerCase(),
    ) ?? result.users?.[0];
  const userId = match?.id?.trim() ?? "";
  if (!userId) {
    return null;
  }

  return { ...found, userId };
}

function parseIndexedAccount(
  value: unknown,
  normalizedEmail: string,
  storageKey?: string,
): IndexedAccount | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as {
    username?: unknown;
    userId?: unknown;
    email?: unknown;
    customId?: unknown;
  };
  const email =
    typeof record.email === "string" && record.email.includes("@")
      ? record.email.toLowerCase()
      : "";
  if (email !== normalizedEmail) {
    return null;
  }

  const fromKey =
    storageKey?.startsWith(USERNAME_INDEX_KEY_PREFIX)
      ? storageKey.slice(USERNAME_INDEX_KEY_PREFIX.length)
      : "";
  const username =
    typeof record.username === "string" && record.username.trim()
      ? record.username
      : fromKey;
  const userId = typeof record.userId === "string" ? record.userId.trim() : "";
  const customId = typeof record.customId === "string" ? record.customId.trim() : "";
  if (!username) {
    return null;
  }

  return { email, username, userId, customId };
}
