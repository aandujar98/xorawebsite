import {
  FRIENDLY_ERROR_MESSAGES,
  type ApiErrorBody,
  type ApiSuccessBody,
  type AppErrorCode,
} from "@/types/api";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/session/constants";

function readCookie(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }

  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

export class ApiClientError extends Error {
  readonly code: AppErrorCode;
  readonly fields?: Record<string, string>;

  constructor(code: AppErrorCode, fields?: Record<string, string>) {
    super(FRIENDLY_ERROR_MESSAGES[code] ?? FRIENDLY_ERROR_MESSAGES.UNEXPECTED);
    this.name = "ApiClientError";
    this.code = code;
    this.fields = fields;
  }
}

async function parseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();

  if (method !== "GET" && method !== "HEAD") {
    headers.set(CSRF_HEADER, readCookie(CSRF_COOKIE));
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      method,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError("SERVER_UNAVAILABLE");
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody & { fields?: Record<string, string> };
    throw new ApiClientError(
      errorBody?.code ?? (response.status === 401 ? "SESSION_EXPIRED" : "UNEXPECTED"),
      errorBody?.fields,
    );
  }

  const success = body as ApiSuccessBody<T>;
  return success.data;
}
