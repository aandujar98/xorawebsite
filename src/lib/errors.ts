import {
  FRIENDLY_ERROR_MESSAGES,
  type AppErrorCode,
} from "@/types/api";

const HTTP_STATUS: Record<AppErrorCode, number> = {
  INVALID_EMAIL: 400,
  INVALID_USERNAME: 400,
  WEAK_PASSWORD: 400,
  PASSWORD_MISMATCH: 400,
  TERMS_REQUIRED: 400,
  INVALID_DISPLAY_NAME: 400,
  INVALID_AVATAR_URL: 400,
  INVALID_CREDENTIALS: 401,
  EMAIL_REGISTERED: 409,
  USERNAME_TAKEN: 409,
  SERVER_UNAVAILABLE: 503,
  NETWORK_TIMEOUT: 504,
  SESSION_EXPIRED: 401,
  RATE_LIMITED: 429,
  FORBIDDEN: 403,
  NAKAMA_SERVER_KEY_INVALID: 503,
  PROFILE_NOT_FOUND: 404,
  INVALID_LOCATION: 400,
  DELETE_CONFIRMATION: 400,
  PASSWORD_RECOVERY_UNAVAILABLE: 501,
  INVALID_AVATAR_IMAGE: 400,
  AVATAR_TOO_LARGE: 400,
  CANNOT_ADD_SELF: 400,
  ALREADY_FRIENDS: 409,
  UNEXPECTED: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;

  constructor(code: AppErrorCode, httpStatus = HTTP_STATUS[code]) {
    super(FRIENDLY_ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError("UNEXPECTED");
}
