import { loginWithEmail, registerWithEmail, signOutSession } from "@/lib/nakama/auth";
import { ACCOUNT_MUTATION_RATE_LIMIT, AUTH_RATE_LIMIT, REGISTER_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiRoute, readJsonBody } from "@/lib/http/route";
import { jsonError, jsonOk } from "@/lib/http/responses";
import { getCurrentAccount } from "@/lib/nakama/account";
import {
  clearSessionCookies,
  readSessionTokens,
  writeSessionCookies,
} from "@/lib/session/cookies";
import { restoreAndRefreshSession } from "@/lib/session/restore";
import {
  validateLoginInput,
  validateRegisterInput,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";
import { AppError } from "@/lib/errors";

function fieldErrorResponse(
  errors: Record<string, string>,
  code?: string,
): Response {
  const resolved = (code ?? Object.values(errors)[0] ?? "UNEXPECTED") as AppErrorCode;
  return jsonError(resolved, {
    fields: Object.fromEntries(
      Object.entries(errors).map(([field, fieldCode]) => [
        field,
        FRIENDLY_ERROR_MESSAGES[fieldCode as AppErrorCode] ?? FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
      ]),
    ),
  });
}

export async function registerHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<RegisterInput>(request);
      const validated = validateRegisterInput(body);

      if (!validated.values) {
        return fieldErrorResponse(validated.errors, validated.code);
      }

      const session = await registerWithEmail(validated.values);
      await writeSessionCookies(session, true);
      const account = await getCurrentAccount(session);
      return jsonOk({ account }, 201);
    },
    { rateLimit: REGISTER_RATE_LIMIT, rateLimitKey: "register" },
  );
}

export async function loginHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<LoginInput>(request);
      const validated = validateLoginInput(body);

      if (!validated.values) {
        return fieldErrorResponse(validated.errors, validated.code);
      }

      const session = await loginWithEmail(validated.values);
      await writeSessionCookies(session, validated.values.rememberMe);
      const account = await getCurrentAccount(session);
      return jsonOk({ account });
    },
    { rateLimit: AUTH_RATE_LIMIT, rateLimitKey: "login" },
  );
}

export async function logoutHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const tokens = await readSessionTokens();
      if (tokens) {
        try {
          const restored = await restoreAndRefreshSession(tokens);
          await signOutSession(restored.session);
        } catch {
          // Continue with local sign-out even if Nakama logout fails.
        }
      }

      await clearSessionCookies();
      return jsonOk({ signedOut: true });
    },
    { rateLimit: AUTH_RATE_LIMIT, rateLimitKey: "logout" },
  );
}

export async function sessionHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const tokens = await readSessionTokens();
      if (!tokens) {
        throw new AppError("SESSION_EXPIRED");
      }

      const restored = await restoreAndRefreshSession(tokens);
      if (restored.refreshed) {
        await writeSessionCookies(restored.session);
      }

      const account = await getCurrentAccount(restored.session);
      return jsonOk({ account });
    },
    { csrf: false },
  );
}

export { ACCOUNT_MUTATION_RATE_LIMIT };
