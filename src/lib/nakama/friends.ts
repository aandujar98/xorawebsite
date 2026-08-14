import type { Session } from "@heroiclabs/nakama-js";
import type { FriendEntry, FriendState, FriendsList } from "@/types/account";
import { AppError } from "@/lib/errors";
import { getCurrentAccount, getNakamaUserByUsername, toPublicProfile } from "@/lib/nakama/account";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import { pushNotification } from "@/lib/nakama/notifications";
import { validateUsername } from "@/lib/validation/auth";

const FRIEND = 0;
const INVITE_SENT = 1;
const INVITE_RECEIVED = 2;

function toFriendState(state: number | undefined): FriendState | null {
  if (state === FRIEND) {
    return "friend";
  }
  if (state === INVITE_SENT) {
    return "outgoing";
  }
  if (state === INVITE_RECEIVED) {
    return "incoming";
  }
  return null;
}

export async function listCurrentFriends(
  session: Session,
  client: NakamaGateway = getNakamaClient(),
): Promise<FriendsList> {
  const result = await withNakamaErrors(() => client.listFriends(session, undefined, 100));
  const friends: FriendEntry[] = [];
  const incoming: FriendEntry[] = [];
  const outgoing: FriendEntry[] = [];

  for (const entry of result.friends ?? []) {
    const mapped = toFriendState(entry.state);
    if (!mapped || !entry.user) {
      continue;
    }

    const item = { ...toPublicProfile(entry.user), state: mapped };
    if (mapped === "friend") {
      friends.push(item);
    } else if (mapped === "incoming") {
      incoming.push(item);
    } else {
      outgoing.push(item);
    }
  }

  return { friends, incoming, outgoing };
}

export async function addFriendByUsername(
  session: Session,
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<FriendsList> {
  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new AppError("INVALID_USERNAME");
  }

  const current = await getCurrentAccount(session, client);
  const typed = username.trim();
  if (current.username.toLowerCase() === typed.toLowerCase()) {
    throw new AppError("CANNOT_ADD_SELF");
  }

  const target = await getNakamaUserByUsername(session, typed, client);
  const canonical = target.username?.trim() ?? typed;

  const existing = await listCurrentFriends(session, client);
  const normalized = canonical.toLowerCase();
  const alreadyLinked = [...existing.friends, ...existing.outgoing].some(
    (entry) => entry.username.toLowerCase() === normalized,
  );
  if (alreadyLinked) {
    throw new AppError("ALREADY_FRIENDS");
  }

  await withNakamaErrors(() => client.addFriends(session, undefined, [canonical]));
  try {
    await pushNotification(
      canonical,
      {
        type: "friend_request",
        fromUsername: current.username,
        fromDisplayName: current.displayName,
        body: `${current.displayName} added you as a friend.`,
        href: "/friends",
      },
      client,
    );
  } catch {
    // The friend request is stored in Nakama even if the inbox write fails.
  }
  return listCurrentFriends(session, client);
}

export async function removeFriendByUsername(
  session: Session,
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<FriendsList> {
  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new AppError("INVALID_USERNAME");
  }

  const target = await getNakamaUserByUsername(session, username, client);
  const canonical = target.username?.trim() ?? username.trim();
  await withNakamaErrors(() => client.deleteFriends(session, undefined, [canonical]));
  return listCurrentFriends(session, client);
}
