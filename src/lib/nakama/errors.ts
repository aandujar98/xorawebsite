import { AppError } from "@/lib/errors";

function readErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "";
  }

  const record = body as Record<string, unknown>;
  const message = record.message ?? record.error;
  return typeof message === "string" ? message.toLowerCase() : "";
}

export async function mapNakamaError(error: unknown): Promise<never> {
  if (error === "Request timed out.") {
    throw new AppError("NETWORK_TIMEOUT");
  }

  if (error instanceof TypeError) {
    throw new AppError("SERVER_UNAVAILABLE");
  }

  if (typeof Response !== "undefined" && error instanceof Response) {
    let message = "";

    try {
      message = readErrorMessage(await error.clone().json());
    } catch {
      message = "";
    }

    if (error.status === 429 || message.includes("rate")) {
      throw new AppError("RATE_LIMITED");
    }

    if (message.includes("server key")) {
      throw new AppError("NAKAMA_SERVER_KEY_INVALID");
    }

    if (
      message.includes("username") &&
      (message.includes("in use") ||
        message.includes("taken") ||
        message.includes("already") ||
        message.includes("exists"))
    ) {
      throw new AppError("USERNAME_TAKEN");
    }

    if (
      message.includes("email") &&
      (message.includes("in use") ||
        message.includes("already") ||
        message.includes("exists"))
    ) {
      throw new AppError("EMAIL_REGISTERED");
    }

    if (
      error.status === 401 ||
      error.status === 404 ||
      message.includes("invalid credentials") ||
      message.includes("not found") ||
      message.includes("unauthenticated")
    ) {
      throw new AppError("INVALID_CREDENTIALS");
    }

    if (error.status === 400 && message.includes("username")) {
      throw new AppError("INVALID_USERNAME");
    }

    if (error.status === 400 && message.includes("password")) {
      throw new AppError("WEAK_PASSWORD");
    }

    if (error.status === 400 && message.includes("email")) {
      throw new AppError("INVALID_EMAIL");
    }

    if (error.status >= 500) {
      throw new AppError("SERVER_UNAVAILABLE");
    }

    throw new AppError("UNEXPECTED");
  }

  throw new AppError("UNEXPECTED");
}

export async function withNakamaErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    return mapNakamaError(error);
  }
}
