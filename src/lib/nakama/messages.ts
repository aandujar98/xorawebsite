import { randomBytes } from "node:crypto";
import type { Session } from "@heroiclabs/nakama-js";
import type {
  DirectMessage,
  MessageInbox,
  MessageThread,
  MessageThreadSummary,
} from "@/types/account";
import { AppError } from "@/lib/errors";
import { getNakamaUserByUsername } from "@/lib/nakama/account";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import { listCurrentFriends } from "@/lib/nakama/friends";
import {
  deleteLookupObject,
  readLookupObject,
  writeLookupObject,
} from "@/lib/nakama/lookup-store";
import { pushNotification } from "@/lib/nakama/notifications";
import { validateUsername } from "@/lib/validation/auth";

export const MESSAGE_COLLECTION = "xora_messages";
export const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES = 40;

function normalizeName(username: string): string {
  return username.trim().toLowerCase();
}

function conversationKey(left: string, right: string): string {
  return `dm:${[normalizeName(left), normalizeName(right)].sort().join(":")}`;
}

function threadIndexKey(username: string): string {
  return `threads:${normalizeName(username)}`;
}

function asMessages(value: unknown): DirectMessage[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const messages = (value as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.fromUsername !== "string" ||
      typeof record.body !== "string" ||
      typeof record.createdAt !== "string"
    ) {
      return [];
    }
    return [
      {
        id: record.id,
        fromUsername: record.fromUsername,
        body: record.body,
        createdAt: record.createdAt,
      },
    ];
  });
}

function asThreadSummaries(value: unknown): MessageThreadSummary[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const threads = (value as { threads?: unknown }).threads;
  if (!Array.isArray(threads)) {
    return [];
  }

  return threads.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    if (
      typeof record.username !== "string" ||
      typeof record.lastBody !== "string" ||
      typeof record.lastAt !== "string"
    ) {
      return [];
    }
    return [
      {
        username: record.username,
        displayName:
          typeof record.displayName === "string" ? record.displayName : record.username,
        lastBody: record.lastBody,
        lastAt: record.lastAt,
        unread: typeof record.unread === "number" ? record.unread : 0,
      },
    ];
  });
}

async function saveThreadIndex(
  username: string,
  threads: MessageThreadSummary[],
  client: NakamaGateway,
): Promise<void> {
  await writeLookupObject(
    MESSAGE_COLLECTION,
    threadIndexKey(username),
    { threads },
    client,
  );
}

function upsertThread(
  threads: MessageThreadSummary[],
  next: MessageThreadSummary,
): MessageThreadSummary[] {
  const remaining = threads.filter(
    (thread) => thread.username.toLowerCase() !== next.username.toLowerCase(),
  );
  return [next, ...remaining].slice(0, MAX_MESSAGES);
}

export function validateMessageBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
    return "INVALID_MESSAGE";
  }
  return null;
}

async function assertFriends(
  session: Session,
  username: string,
  client: NakamaGateway,
): Promise<void> {
  const list = await listCurrentFriends(session, client);
  const isFriend = list.friends.some(
    (entry) => entry.username.toLowerCase() === username.toLowerCase(),
  );
  if (!isFriend) {
    throw new AppError("NOT_FRIENDS");
  }
}

export async function listMessageInbox(
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<MessageInbox> {
  const threads = asThreadSummaries(
    await readLookupObject(MESSAGE_COLLECTION, threadIndexKey(username), client),
  );
  return { threads };
}

export async function getMessageThread(
  session: Session,
  currentUsername: string,
  otherUsername: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<MessageThread> {
  const usernameError = validateUsername(otherUsername);
  if (usernameError) {
    throw new AppError("INVALID_USERNAME");
  }
  if (normalizeName(currentUsername) === normalizeName(otherUsername)) {
    throw new AppError("CANNOT_ADD_SELF");
  }

  await assertFriends(session, otherUsername, client);
  const other = await getNakamaUserByUsername(session, otherUsername, client);
  const canonical = other.username?.trim() || otherUsername.trim();
  const stored = await readLookupObject(
    MESSAGE_COLLECTION,
    conversationKey(currentUsername, canonical),
    client,
  );
  const messages = asMessages(stored);

  const threads = asThreadSummaries(
    await readLookupObject(MESSAGE_COLLECTION, threadIndexKey(currentUsername), client),
  );
  const updated = threads.map((thread) =>
    thread.username.toLowerCase() === canonical.toLowerCase()
      ? { ...thread, unread: 0 }
      : thread,
  );
  await saveThreadIndex(currentUsername, updated, client);

  return {
    username: canonical,
    displayName: other.display_name?.trim() || canonical,
    messages,
  };
}

export async function sendDirectMessage(
  session: Session,
  otherUsername: string,
  body: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<MessageThread> {
  const bodyError = validateMessageBody(body);
  if (bodyError) {
    throw new AppError("INVALID_MESSAGE");
  }

  const account = await withNakamaErrors(() => client.getAccount(session));
  const currentUsername = account.user?.username?.trim() ?? "";
  const currentDisplay = account.user?.display_name?.trim() || currentUsername;
  const usernameError = validateUsername(otherUsername);
  if (usernameError) {
    throw new AppError("INVALID_USERNAME");
  }
  if (!currentUsername || normalizeName(currentUsername) === normalizeName(otherUsername)) {
    throw new AppError("CANNOT_ADD_SELF");
  }

  await assertFriends(session, otherUsername, client);
  const other = await getNakamaUserByUsername(session, otherUsername, client);
  const canonical = other.username?.trim() || otherUsername.trim();
  const otherDisplay = other.display_name?.trim() || canonical;
  const trimmedBody = body.trim();
  const createdAt = new Date().toISOString();
  const message: DirectMessage = {
    id: randomBytes(12).toString("hex"),
    fromUsername: currentUsername,
    body: trimmedBody,
    createdAt,
  };

  const key = conversationKey(currentUsername, canonical);
  const existing = asMessages(await readLookupObject(MESSAGE_COLLECTION, key, client));
  const messages = [...existing, message].slice(-MAX_MESSAGES);
  await writeLookupObject(
    MESSAGE_COLLECTION,
    key,
    {
      participants: [currentUsername, canonical],
      messages,
    },
    client,
  );

  const senderThreads = asThreadSummaries(
    await readLookupObject(MESSAGE_COLLECTION, threadIndexKey(currentUsername), client),
  );
  await saveThreadIndex(
    currentUsername,
    upsertThread(senderThreads, {
      username: canonical,
      displayName: otherDisplay,
      lastBody: trimmedBody,
      lastAt: createdAt,
      unread: 0,
    }),
    client,
  );

  const recipientThreads = asThreadSummaries(
    await readLookupObject(MESSAGE_COLLECTION, threadIndexKey(canonical), client),
  );
  const previous = recipientThreads.find(
    (thread) => thread.username.toLowerCase() === currentUsername.toLowerCase(),
  );
  await saveThreadIndex(
    canonical,
    upsertThread(recipientThreads, {
      username: currentUsername,
      displayName: currentDisplay,
      lastBody: trimmedBody,
      lastAt: createdAt,
      unread: (previous?.unread ?? 0) + 1,
    }),
    client,
  );

  try {
    await pushNotification(
      canonical,
      {
        type: "message",
        fromUsername: currentUsername,
        fromDisplayName: currentDisplay,
        body: `${currentDisplay}: ${trimmedBody}`,
        href: `/messages/${encodeURIComponent(currentUsername)}`,
      },
      client,
    );
  } catch {
    // The message is stored even if the notification write fails.
  }

  return {
    username: canonical,
    displayName: otherDisplay,
    messages,
  };
}

export async function migrateMessageInbox(
  oldUsername: string,
  newUsername: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  if (normalizeName(oldUsername) === normalizeName(newUsername)) {
    return;
  }

  const threads = asThreadSummaries(
    await readLookupObject(MESSAGE_COLLECTION, threadIndexKey(oldUsername), client),
  );
  for (const thread of threads) {
    const oldKey = conversationKey(oldUsername, thread.username);
    const newKey = conversationKey(newUsername, thread.username);
    const stored = await readLookupObject(MESSAGE_COLLECTION, oldKey, client);
    if (stored && typeof stored === "object") {
      const record = stored as { participants?: string[]; messages?: DirectMessage[] };
      await writeLookupObject(
        MESSAGE_COLLECTION,
        newKey,
        {
          participants: [newUsername, thread.username],
          messages: record.messages ?? asMessages(stored),
        },
        client,
      );
      if (oldKey !== newKey) {
        await deleteLookupObject(MESSAGE_COLLECTION, oldKey, client).catch(() => undefined);
      }
    }

    const otherThreads = asThreadSummaries(
      await readLookupObject(MESSAGE_COLLECTION, threadIndexKey(thread.username), client),
    );
    await saveThreadIndex(
      thread.username,
      otherThreads.map((entry) =>
        entry.username.toLowerCase() === normalizeName(oldUsername)
          ? { ...entry, username: newUsername }
          : entry,
      ),
      client,
    );
  }

  if (threads.length > 0) {
    await saveThreadIndex(newUsername, threads, client);
  }
  await deleteLookupObject(MESSAGE_COLLECTION, threadIndexKey(oldUsername), client).catch(
    () => undefined,
  );
}
