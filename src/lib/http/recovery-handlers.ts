import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import { AUTH_RATE_LIMIT, ACCOUNT_MUTATION_RATE_LIMIT, checkRateLimit } from "@/lib/rate-limit";
import { handleApiRoute, readJsonBody } from "@/lib/http/route";
import { jsonError, jsonOk } from "@/lib/http/responses";
import { getCurrentAccount } from "@/lib/nakama/account";
import {
  changeCurrentPassword,
  completePasswordRecovery,
  createRecoveryRequestId,
  recoveryLog,
  requestPasswordRecovery,
} from "@/lib/nakama/recovery";
import { requireRestoredSession } from "@/lib/session/require";
import {
  normalizeEmail,
  validateEmail,
  validatePasswordChangeInput,
  validateResetPasswordInput,
} from "@/lib/validation/auth";
import { PASSWORD_RECOVERY_ACCEPTED_MESSAGE } from "@/lib/recovery-message";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

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

function hashedRateLimitKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function forgotPasswordHandler(request: Request): Promise<Response> {
  const requestId = createRecoveryRequestId();
  recoveryLog(requestId, "http_forgot_start");

  return handleApiRoute(
    request,
    async () => {
      let body: { email?: string };
      try {
        body = await readJsonBody<{ email?: string }>(request);
      } catch {
        recoveryLog(requestId, "http_forgot_invalid_json");
        return jsonError("UNEXPECTED");
      }

      const emailError = validateEmail(body.email ?? "");
      if (emailError) {
        recoveryLog(requestId, "http_forgot_invalid_email");
        return fieldErrorResponse({ email: emailError }, emailError);
      }

      const emailLimit = checkRateLimit(
        `forgot-password:email:${hashedRateLimitKey(normalizeEmail(body.email ?? ""))}`,
        AUTH_RATE_LIMIT,
      );
      if (!emailLimit.allowed) {
        recoveryLog(requestId, "http_forgot_rate_limited");
        return jsonError("RATE_LIMITED");
      }

      recoveryLog(requestId, "http_forgot_validated");
      const result = await requestPasswordRecovery(
        body.email ?? "",
        undefined,
        requestId,
      );
      if (result.status === "unavailable") {
        recoveryLog(requestId, "http_forgot_unavailable");
        throw new AppError("PASSWORD_RECOVERY_UNAVAILABLE");
      }

      recoveryLog(requestId, "http_forgot_ok");
      return jsonOk({
        accepted: true,
        message: PASSWORD_RECOVERY_ACCEPTED_MESSAGE,
      });
    },
    { rateLimit: AUTH_RATE_LIMIT, rateLimitKey: "forgot-password" },
  );
}

export async function resetPasswordHandler(request: Request): Promise<Response> {
  const requestId = createRecoveryRequestId();
  recoveryLog(requestId, "http_reset_start");

  return handleApiRoute(
    request,
    async () => {
      let body: {
        token?: string;
        password?: string;
        confirmPassword?: string;
      };
      try {
        body = await readJsonBody<{
          token?: string;
          password?: string;
          confirmPassword?: string;
        }>(request);
      } catch {
        recoveryLog(requestId, "http_reset_invalid_json");
        return jsonError("UNEXPECTED");
      }

      const validated = validateResetPasswordInput({
        token: body.token ?? "",
        password: body.password ?? "",
        confirmPassword: body.confirmPassword ?? "",
      });
      if (!validated.values) {
        recoveryLog(requestId, "http_reset_invalid_input", {
          code: validated.code ?? "UNEXPECTED",
        });
        return fieldErrorResponse(validated.errors, validated.code);
      }

      const tokenLimit = checkRateLimit(
        `reset-password:token:${hashedRateLimitKey(validated.values.token)}`,
        AUTH_RATE_LIMIT,
      );
      if (!tokenLimit.allowed) {
        recoveryLog(requestId, "http_reset_rate_limited");
        return jsonError("RATE_LIMITED");
      }

      recoveryLog(requestId, "http_reset_validated");
      await completePasswordRecovery(
        validated.values.token,
        validated.values.password,
        undefined,
        requestId,
      );
      recoveryLog(requestId, "http_reset_ok");
      return jsonOk({ reset: true });
    },
    { rateLimit: AUTH_RATE_LIMIT, rateLimitKey: "reset-password" },
  );
}

export async function changePasswordHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      let body: {
        currentPassword?: string;
        password?: string;
        confirmPassword?: string;
      };
      try {
        body = await readJsonBody<{
          currentPassword?: string;
          password?: string;
          confirmPassword?: string;
        }>(request);
      } catch {
        return jsonError("UNEXPECTED");
      }

      const validated = validatePasswordChangeInput({
        currentPassword: body.currentPassword ?? "",
        password: body.password ?? "",
        confirmPassword: body.confirmPassword ?? "",
      });
      if (!validated.values) {
        return fieldErrorResponse(validated.errors, validated.code);
      }

      const session = await requireRestoredSession();
      const account = await getCurrentAccount(session);
      if (!account.email) {
        throw new AppError("PASSWORD_RECOVERY_UNAVAILABLE");
      }

      await changeCurrentPassword(
        session,
        validated.values.currentPassword,
        validated.values.password,
        account.email,
      );
      return jsonOk({ changed: true });
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "password-change" },
  );
}
