export const APP_ERROR_CODES = [
  "INVALID_EMAIL",
  "INVALID_USERNAME",
  "WEAK_PASSWORD",
  "PASSWORD_MISMATCH",
  "TERMS_REQUIRED",
  "INVALID_DISPLAY_NAME",
  "INVALID_AVATAR_URL",
  "INVALID_CREDENTIALS",
  "EMAIL_REGISTERED",
  "USERNAME_TAKEN",
  "SERVER_UNAVAILABLE",
  "NETWORK_TIMEOUT",
  "SESSION_EXPIRED",
  "RATE_LIMITED",
  "FORBIDDEN",
  "NAKAMA_SERVER_KEY_INVALID",
  "PROFILE_NOT_FOUND",
  "INVALID_LOCATION",
  "DELETE_CONFIRMATION",
  "PASSWORD_RECOVERY_UNAVAILABLE",
  "INVALID_AVATAR_IMAGE",
  "AVATAR_TOO_LARGE",
  "CANNOT_ADD_SELF",
  "ALREADY_FRIENDS",
  "NOT_FRIENDS",
  "INVALID_MESSAGE",
  "INVALID_RESET_TOKEN",
  "MAIL_TEST_MODE",
  "UNEXPECTED",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export const FRIENDLY_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_USERNAME:
    "Usernames must be 3–128 characters with no spaces or control characters.",
  WEAK_PASSWORD:
    "Use a password with at least 8 characters, including a letter and a number.",
  PASSWORD_MISMATCH: "Those passwords do not match.",
  TERMS_REQUIRED: "Please accept the XOrA Network terms to continue.",
  INVALID_DISPLAY_NAME: "Display names must be 1–64 characters.",
  INVALID_AVATAR_URL: "Enter a valid https image URL, or leave the field blank.",
  INVALID_CREDENTIALS: "Email, username, or password is incorrect.",
  EMAIL_REGISTERED: "An account with this email already exists.",
  USERNAME_TAKEN: "That username is already taken.",
  SERVER_UNAVAILABLE:
    "XOrA Network is temporarily unavailable. Please try again in a moment.",
  NETWORK_TIMEOUT: "The request timed out. Please try again.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
  FORBIDDEN: "This request could not be verified. Refresh the page and try again.",
  NAKAMA_SERVER_KEY_INVALID:
    "The Nakama server key is invalid. Update NAKAMA_SERVER_KEY in .env.local to the socket.server_key from your Nakama config. This is not the console or database password.",
  PROFILE_NOT_FOUND: "That XOrA Network profile could not be found.",
  INVALID_LOCATION: "Location must be 64 characters or fewer.",
  DELETE_CONFIRMATION: "Type your username to confirm account deletion.",
  PASSWORD_RECOVERY_UNAVAILABLE:
    "Password recovery is not configured on this server yet.",
  INVALID_AVATAR_IMAGE: "Choose a JPEG, PNG, WebP, or GIF photo from your device.",
  AVATAR_TOO_LARGE: "Photos must be 8 MB or smaller.",
  CANNOT_ADD_SELF: "You cannot add yourself as a friend.",
  ALREADY_FRIENDS: "You are already friends, or a request is already pending.",
  NOT_FRIENDS: "You can only message people on your friends list.",
  INVALID_MESSAGE: "Enter a message between 1 and 500 characters.",
  INVALID_RESET_TOKEN: "This reset link is invalid or has expired.",
  MAIL_TEST_MODE:
    "Resend is still in test mode, so it can only email the inbox you used to create the Resend account. Check that inbox and spam, or verify xoranetwork.com in Resend to send to Gmail.",
  UNEXPECTED: "Something went wrong. Please try again.",
};

export type ApiErrorBody = {
  ok: false;
  code: AppErrorCode;
  message: string;
};

export type ApiSuccessBody<T> = {
  ok: true;
  data: T;
};
