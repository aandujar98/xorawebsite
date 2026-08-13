import { AppError, isAppError } from "@/lib/errors";
import {
  FRIENDLY_ERROR_MESSAGES,
  type ApiErrorBody,
  type ApiSuccessBody,
  type AppErrorCode,
} from "@/types/api";

export function jsonError(
  code: AppErrorCode,
  extras?: Record<string, unknown>,
): Response {
  const error = new AppError(code);
  const body: ApiErrorBody & Record<string, unknown> = {
    ok: false,
    code: error.code,
    message: FRIENDLY_ERROR_MESSAGES[error.code],
    ...extras,
  };

  return Response.json(body, {
    status: error.httpStatus,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function jsonOk<T>(data: T, status = 200): Response {
  const body: ApiSuccessBody<T> = { ok: true, data };
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function toErrorResponse(error: unknown): Response {
  if (isAppError(error)) {
    return jsonError(error.code);
  }

  return jsonError("UNEXPECTED");
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}
