import { AppError } from "@/lib/errors";
import { checkRateLimit, type RateLimitWindow } from "@/lib/rate-limit";
import { getClientIp, jsonError, toErrorResponse } from "@/lib/http/responses";
import { assertCsrf, assertSameOrigin } from "@/lib/session/csrf";

type RouteOptions = {
  csrf?: boolean;
  rateLimit?: RateLimitWindow;
  rateLimitKey?: string;
};

export async function handleApiRoute(
  request: Request,
  handler: () => Promise<Response>,
  options: RouteOptions = {},
): Promise<Response> {
  try {
    if (options.rateLimit) {
      const ip = getClientIp(request);
      const result = checkRateLimit(
        `${options.rateLimitKey ?? request.url}:${ip}`,
        options.rateLimit,
      );

      if (!result.allowed) {
        return jsonError("RATE_LIMITED");
      }
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      assertSameOrigin(request);
      if (options.csrf !== false) {
        await assertCsrf(request);
      }
    }

    return await handler();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("UNEXPECTED");
    }

    if (error instanceof AppError) {
      return toErrorResponse(error);
    }

    return toErrorResponse(error);
  }
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
