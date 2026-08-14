import { AppError } from "@/lib/errors";
import { ACCOUNT_MUTATION_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiRoute, readJsonBody } from "@/lib/http/route";
import { jsonError, jsonOk } from "@/lib/http/responses";
import {
  deleteCurrentAccount,
  getCurrentAccount,
  getProfileByUsername,
  updateCurrentProfile,
} from "@/lib/nakama/account";
import { deleteCurrentAvatar } from "@/lib/nakama/avatar";
import { migrateMessageInbox } from "@/lib/nakama/messages";
import { migrateNotificationInbox } from "@/lib/nakama/notifications";
import { clearSessionCookies, writeSessionCookies } from "@/lib/session/cookies";
import { requireRestoredSession } from "@/lib/session/require";
import { validateProfileInput } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

export async function getAccountHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const session = await requireRestoredSession();
      const account = await getCurrentAccount(session);
      return jsonOk({ account });
    },
    { csrf: false },
  );
}

export async function updateAccountHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<{
        displayName?: string;
        username?: string;
        avatarUrl?: string;
        location?: string;
      }>(request);
      const validated = validateProfileInput({
        displayName: body.displayName ?? "",
        username: body.username ?? "",
        avatarUrl: body.avatarUrl ?? "",
        location: body.location ?? "",
      });

      if (!validated.values) {
        const resolved = (validated.code ?? "UNEXPECTED") as AppErrorCode;
        return jsonError(resolved, {
          fields: Object.fromEntries(
            Object.entries(validated.errors).map(([field, fieldCode]) => [
              field,
              FRIENDLY_ERROR_MESSAGES[fieldCode as AppErrorCode] ??
                FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
            ]),
          ),
        });
      }

      const session = await requireRestoredSession();
      const updated = await updateCurrentProfile(session, validated.values);
      if (updated.usernameChanged) {
        try {
          await migrateNotificationInbox(
            updated.previousUsername,
            updated.account.username,
          );
          await migrateMessageInbox(updated.previousUsername, updated.account.username);
        } catch {
          // Profile update succeeded; inbox keys catch up on the next write.
        }
      }
      await writeSessionCookies(updated.session);
      return jsonOk({ account: updated.account });
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "account-update" },
  );
}

export async function deleteAccountHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<{ confirmation?: string }>(request);
      const session = await requireRestoredSession();
      const account = await getCurrentAccount(session);
      const confirmation = body.confirmation?.trim() ?? "";

      if (confirmation !== account.username) {
        throw new AppError("DELETE_CONFIRMATION");
      }

      await deleteCurrentAvatar(session);
      await deleteCurrentAccount(session);
      await clearSessionCookies();
      return jsonOk({ deleted: true });
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "account-delete" },
  );
}

export async function getPublicProfileHandler(
  request: Request,
  username: string,
): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const session = await requireRestoredSession();
      const profile = await getProfileByUsername(session, username);
      return jsonOk({ profile });
    },
    { csrf: false },
  );
}
