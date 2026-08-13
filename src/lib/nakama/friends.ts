import type { Session } from "@heroiclabs/nakama-js";
import type { FriendEntry, FriendState, FriendsList } from "@/types/account";
import { AppError } from "@/lib/errors";
import { getCurrentAccount, toPublicProfile } from "@/lib/nakama/account";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
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
  if (current.username.toLowerCase() === username.trim().toLowerCase()) {
    throw new AppError("CANNOT_ADD_SELF");
  }

  const existing = await listCurrentFriends(session, client);
  const normalized = username.trim().toLowerCase();
  const incoming = existing.incoming.some(
    (entry) => entry.username.toLowerCase() === normalized,
  );
  const alreadyLinked = [...existing.friends, ...existing.outgoing].some(
    (entry) => entry.username.toLowerCase() === normalized,
  );
  if (alreadyLinked) {
    throw new AppError("ALREADY_FRIENDS");
  }

  if (!incoming) {
    const users = await withNakamaErrors(() =>
      client.getUsers(session, undefined, [username.trim()]),
    );
    if (!users.users?.[0]) {
      throw new AppError("PROFILE_NOT_FOUND");
    }
  }

  await withNakamaErrors(() => client.addFriends(session, undefined, [username.trim()]));
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

  await withNakamaErrors(() => client.deleteFriends(session, undefined, [username.trim()]));
  return listCurrentFriends(session, client);
}
