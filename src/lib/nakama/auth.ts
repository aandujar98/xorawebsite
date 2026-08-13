import type { Session } from "@heroiclabs/nakama-js";
import { AppError } from "@/lib/errors";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import type { ValidatedLoginInput, ValidatedRegisterInput } from "@/lib/validation/auth";

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

  return session;
}

export async function loginWithEmail(
  input: ValidatedLoginInput,
  client: NakamaGateway = getNakamaClient(),
): Promise<Session> {
  return withNakamaErrors(() =>
    client.authenticateEmail(input.email, input.password, false),
  );
}

export async function signOutSession(
  session: Session,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  await invalidateSession(client, session);
}
