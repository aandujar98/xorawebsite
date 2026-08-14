export const PASSWORD_RECOVERY_ACCEPTED_MESSAGE =
  "If an account exists for that email, a password-reset link has been sent.";

export const RECOVERY_REQUEST_RPC = "xora_user_by_email";
export const RECOVERY_CONFIRM_RPC = "xora_set_password";
export const RECOVERY_TOKEN_TTL_MS = 15 * 60 * 1000;
export const RECOVERY_FETCH_TIMEOUT_MS = 15_000;
