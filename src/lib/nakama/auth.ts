import type { Session } from "@heroiclabs/nakama-js";
import { AppError } from "@/lib/errors";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import type { ValidatedLoginInput, ValidatedRegisterInput } from "@/lib/validation/auth";
import { looksLikeEmail } from "@/lib/validation/auth";
import { ensureRecoveryLink } from "@/lib/nakama/recovery";
import {
  rememberUsernameEmail,
  resolveEmailForUsername,
} from "@/lib/nakama/username-index";

async function invalidateSession(client: NakamaGateway, session: Session) {
  try {
    await client.sessionLogout(session, session.token, session.refresh_token);
  } catch {
    // The session is discarded either way. Never log tokens.
  }
}

export async function registerWithEmail(
  input: ValidatedRegisterInput,
  client: NakamaGateway = getNakamaClient(),
): Promise<Session> {
  const session = await withNakamaErrors(() =>
    client.authenticateEmail(input.email, input.password, true, input.username),
  );

  if (!session.created) {
    await invalidateSession(client, session);
    throw new AppError("EMAIL_REGISTERED");
  }

  await withNakamaErrors(() =>
    client.updateAccount(session, { display_name: input.displayName }),
  );

  try {
    const customId = await ensureRecoveryLink(session, session.user_id ?? "", client);
    await rememberUsernameEmail(
      input.username,
      input.email,
      client,
      session.user_id ?? "",
      customId,
    );
  } catch {
    // Username sign-in still works after the next successful email login.
  }

  return session;
}

export async function loginWithEmail(
  input: ValidatedLoginInput,
  client: NakamaGateway = getNakamaClient(),
): Promise<Session> {
  const email = looksLikeEmail(input.identifier)
    ? input.identifier
    : await resolveEmailForUsername(input.identifier, client);

  if (!email) {
    throw new AppError("INVALID_CREDENTIALS");
  }

  return withNakamaErrors(() =>
    client.authenticateEmail(email, input.password, false),
  );
}

export async function signOutSession(
  session: Session,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  await invalidateSession(client, session);
}
