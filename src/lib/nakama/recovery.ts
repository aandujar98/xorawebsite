import { createHmac, createHash, randomBytes, randomUUID } from "node:crypto";
import type { Session } from "@heroiclabs/nakama-js";
import { AppError } from "@/lib/errors";
import {
  getMailTestRecipient,
  getNakamaServerConfig,
  getSiteUrl,
} from "@/lib/env";
import { isMailConfigured, sendMail } from "@/lib/mail/send";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import {
  confirmRecoveryTokenRpc,
  requestRecoveryTokenRpc,
} from "@/lib/nakama/recovery-rpc";
import {
  PASSWORD_RECOVERY_ACCEPTED_MESSAGE,
  RECOVERY_TOKEN_TTL_MS,
} from "@/lib/recovery-message";

export function createRecoveryRequestId(): string {
  return randomUUID();
}

export function hashRecoveryToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function recoveryLog(
  requestId: string,
  stage: string,
  extra: Record<string, unknown> = {},
) {
  console.warn("[recovery]", { requestId, stage, ...extra });
}

export function recoveryCustomId(userId: string): string {
  return createHmac("sha256", getNakamaServerConfig().serverKey)
    .update(`xora-recovery:${userId}`)
    .digest("hex");
}

export async function ensureRecoveryLink(
  session: Session,
  userId: string,
  client: NakamaGateway = getNakamaClient(),
  existingCustomId = "",
): Promise<string> {
  const existing = existingCustomId.trim();
  if (existing) {
    return existing;
  }

  const trimmed = userId.trim() || session.user_id || "";
  if (!trimmed) {
    return "";
  }

  const id = recoveryCustomId(trimmed);
  try {
    await client.linkCustom(session, { id });
    return id;
  } catch (error) {
    recoveryLog("link-custom", "link_custom_failed", {
      code: error instanceof AppError ? error.code : "link_failed",
    });
    return "";
  }
}

export async function requestPasswordRecovery(
  email: string,
  client?: NakamaGateway,
  requestId = createRecoveryRequestId(),
): Promise<{ status: "accepted" | "unavailable" }> {
  const gateway = client ?? getNakamaClient();
  recoveryLog(requestId, "request_start");

  if (!isMailConfigured()) {
    recoveryLog(requestId, "mail_not_configured");
    return { status: "unavailable" };
  }

  const normalized = email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashRecoveryToken(token);
  const exp = Date.now() + RECOVERY_TOKEN_TTL_MS;

  let created = false;
  try {
    created = await requestRecoveryTokenRpc(
      normalized,
      tokenHash,
      exp,
      requestId,
      gateway,
    );
  } catch (error) {
    recoveryLog(requestId, "request_rpc_failed", {
      code: error instanceof AppError ? error.code : "UNEXPECTED",
    });
    throw error instanceof AppError ? error : new AppError("SERVER_UNAVAILABLE");
  }

  if (!created) {
    recoveryLog(requestId, "request_accepted_without_mail");
    return { status: "accepted" };
  }

  const resetUrl = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const recipient = getMailTestRecipient() || normalized;
  recoveryLog(requestId, "mail_send_start", {
    testInboxConfigured: Boolean(getMailTestRecipient()),
    usingTestInbox: Boolean(getMailTestRecipient()),
  });

  const lines = [
    "We received a request to reset your XOrA Network password.",
    "",
    "Open this link within 15 minutes to choose a new password:",
    resetUrl,
    "",
    "If you did not ask for this, you can ignore the email.",
  ];

  try {
    await sendMail({
      to: recipient,
      subject: "Reset your XOrA Network password",
      text: lines.join("\n"),
    });
    recoveryLog(requestId, "mail_send_ok");
  } catch (error) {
    recoveryLog(requestId, "mail_send_failed", {
      code: error instanceof AppError ? error.code : "send_failed",
    });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("PASSWORD_RECOVERY_UNAVAILABLE");
  }

  recoveryLog(requestId, "request_accepted");
  return { status: "accepted" };
}

export async function completePasswordRecovery(
  token: string,
  password: string,
  client?: NakamaGateway,
  requestId = createRecoveryRequestId(),
): Promise<void> {
  const gateway = client ?? getNakamaClient();
  recoveryLog(requestId, "confirm_start");
  const tokenHash = hashRecoveryToken(token);

  let updated = false;
  try {
    updated = await confirmRecoveryTokenRpc(
      tokenHash,
      password,
      requestId,
      gateway,
    );
  } catch (error) {
    recoveryLog(requestId, "confirm_rpc_failed", {
      code: error instanceof AppError ? error.code : "UNEXPECTED",
    });
    throw error instanceof AppError ? error : new AppError("SERVER_UNAVAILABLE");
  }

  if (!updated) {
    recoveryLog(requestId, "confirm_rejected");
    throw new AppError("INVALID_RESET_TOKEN");
  }

  recoveryLog(requestId, "confirm_ok");
}

export async function changeCurrentPassword(
  session: Session,
  currentPassword: string,
  nextPassword: string,
  email: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  await withNakamaErrors(() =>
    client.authenticateEmail(email, currentPassword, false),
  );
  await withNakamaErrors(() =>
    client.linkEmail(session, { email, password: nextPassword }),
  );
}

export { PASSWORD_RECOVERY_ACCEPTED_MESSAGE };
