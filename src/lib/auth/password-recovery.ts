export const PASSWORD_RECOVERY_ENABLED = false;

export type PasswordRecoveryResult =
  | { status: "unavailable" }
  | { status: "accepted" };

export async function requestPasswordRecovery(
  email: string,
): Promise<PasswordRecoveryResult> {
  void email;
  if (!PASSWORD_RECOVERY_ENABLED) {
    return { status: "unavailable" };
  }

  return { status: "accepted" };
}
