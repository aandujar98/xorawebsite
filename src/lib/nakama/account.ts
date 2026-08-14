import type { Session } from "@heroiclabs/nakama-js";
import type { PublicAccount, PublicProfile } from "@/types/account";
import {
  getNakamaClient,
  type NakamaAccountSnapshot,
  type NakamaGateway,
  type NakamaUserSnapshot,
} from "@/lib/nakama/client";
import { AppError } from "@/lib/errors";
import { withNakamaErrors } from "@/lib/nakama/errors";
import { forgetUsernameEmail, rememberUsernameEmail } from "@/lib/nakama/username-index";
import { ensureRecoveryLink } from "@/lib/nakama/recovery";
import { getSiteUrl } from "@/lib/env";
import { hostedAvatarPath, isHostedAvatarUrl } from "@/lib/validation/avatar";

function formatTimestamp(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function toPublicProfile(user: NakamaUserSnapshot): PublicProfile {
  const username = user.username ?? "";
  return {
    id: username,
    username,
    displayName: user.display_name?.trim() || username,
    avatarUrl: user.avatar_url ?? "",
    location: user.location?.trim() ?? "",
    createdAt: formatTimestamp(user.create_time),
    online: Boolean(user.online),
  };
}

export function toPublicAccount(account: NakamaAccountSnapshot): PublicAccount {
  const user = account.user ?? {};
  const deviceCount = account.devices?.length ?? 0;

  return {
    ...toPublicProfile(user),
    email: account.email ?? "",
    disabled: Boolean(account.disable_time),
    emailVerified: false,
    connectedMethods: [
      {
        id: "email",
        label: "Email and password",
        connected: Boolean(account.email),
        detail: account.email ? "Connected" : "Not connected",
      },
      {
        id: "devices",
        label: "Linked XOrA devices",
        connected: deviceCount > 0,
        detail:
          deviceCount > 0
            ? `${deviceCount} device${deviceCount === 1 ? "" : "s"} linked`
            : "Coming soon",
      },
    ],
  };
}

export async function getCurrentAccount(
  session: Session,
  client: NakamaGateway = getNakamaClient(),
): Promise<PublicAccount> {
  const account = await withNakamaErrors(() => client.getAccount(session));
  const mapped = toPublicAccount(account);
  const userId = account.user?.id || session.user_id || "";
  let customId = "";
  try {
    customId = await ensureRecoveryLink(session, userId, client, account.custom_id ?? "");
  } catch (error) {
    console.warn(
      "[recovery] could not prepare recovery identity",
      error instanceof AppError ? error.code : "link_failed",
    );
  }
  try {
    await rememberUsernameEmail(mapped.username, mapped.email, client, userId, customId);
  } catch {
    // Username sign-in still works after the next successful email login.
  }
  return mapped;
}

export async function getNakamaUserByUsername(
  session: Session,
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<NakamaUserSnapshot> {
  const trimmed = username.trim();
  const lookups = [trimmed];
  const lowered = trimmed.toLowerCase();
  if (lowered !== trimmed) {
    lookups.push(lowered);
  }

  const result = await withNakamaErrors(() =>
    client.getUsers(session, undefined, lookups),
  );
  const users = result.users ?? [];
  const exact = users.find((user) => user.username === trimmed);
  const caseInsensitive = users.find(
    (user) => user.username?.toLowerCase() === lowered,
  );
  const user = exact ?? caseInsensitive ?? users[0];
  if (!user?.id) {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  return user;
}

export async function getProfileByUsername(
  session: Session,
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<PublicProfile> {
  return toPublicProfile(await getNakamaUserByUsername(session, username, client));
}

export async function updateCurrentProfile(
  session: Session,
  input: {
    displayName: string;
    username: string;
    avatarUrl: string;
    location: string;
  },
  client: NakamaGateway = getNakamaClient(),
): Promise<{
  account: PublicAccount;
  session: Session;
  usernameChanged: boolean;
  previousUsername: string;
}> {
  const current = await getCurrentAccount(session, client);
  const usernameChanged = current.username !== input.username;
  let avatarUrl = input.avatarUrl;
  if (usernameChanged && isHostedAvatarUrl(avatarUrl, current.username)) {
    avatarUrl = `${getSiteUrl()}${hostedAvatarPath(input.username)}?v=${Date.now()}`;
  }

  await withNakamaErrors(() =>
    client.updateAccount(session, {
      display_name: input.displayName,
      username: input.username,
      avatar_url: avatarUrl,
      location: input.location,
    }),
  );

  let nextSession = session;
  if (usernameChanged) {
    nextSession = await withNakamaErrors(() => client.sessionRefresh(session));
    try {
      await forgetUsernameEmail(current.username, client);
    } catch {
      // The new username is written when the updated account is loaded.
    }
  }

  const account = await getCurrentAccount(nextSession, client);
  return {
    account,
    session: nextSession,
    usernameChanged,
    previousUsername: current.username,
  };
}

export async function deleteCurrentAccount(
  session: Session,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  await withNakamaErrors(() => client.deleteAccount(session));
}
