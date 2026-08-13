import type { Session } from "@heroiclabs/nakama-js";
import type { PublicAccount, PublicProfile } from "@/types/account";
import {
  getNakamaClient,
  type NakamaAccountSnapshot,
  type NakamaGateway,
  type NakamaUserSnapshot,
} from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import { AppError } from "@/lib/errors";

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
  return toPublicAccount(account);
}

export async function getProfileByUsername(
  session: Session,
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<PublicProfile> {
  const result = await withNakamaErrors(() =>
    client.getUsers(session, undefined, [username]),
  );
  const user = result.users?.[0];
  if (!user) {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  return toPublicProfile(user);
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
): Promise<{ account: PublicAccount; session: Session; usernameChanged: boolean }> {
  const current = await getCurrentAccount(session, client);
  const usernameChanged = current.username !== input.username;

  await withNakamaErrors(() =>
    client.updateAccount(session, {
      display_name: input.displayName,
      username: input.username,
      avatar_url: input.avatarUrl,
      location: input.location,
    }),
  );

  let nextSession = session;
  if (usernameChanged) {
    nextSession = await withNakamaErrors(() => client.sessionRefresh(session));
  }

  const account = await getCurrentAccount(nextSession, client);
  return { account, session: nextSession, usernameChanged };
}

export async function deleteCurrentAccount(
  session: Session,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  await withNakamaErrors(() => client.deleteAccount(session));
}
