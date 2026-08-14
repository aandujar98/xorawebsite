import { createHmac } from "node:crypto";
import { AppError } from "@/lib/errors";
import { getNakamaHttpKey, getRecoverySecret } from "@/lib/env";
import { getNakamaClient, type NakamaGateway } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import { getLookupSession } from "@/lib/nakama/username-index";
import {
  RECOVERY_CONFIRM_RPC,
  RECOVERY_REQUEST_RPC,
} from "@/lib/recovery-message";

function recoverySecret(): string {
  try {
    return getRecoverySecret();
  } catch {
    throw new AppError("PASSWORD_RECOVERY_UNAVAILABLE");
  }
}

export function signRecoveryMessage(message: string): string {
  return createHmac("sha256", recoverySecret()).update(message).digest("hex");
}

function readPayload(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function recoveryLog(
  requestId: string,
  stage: string,
  extra: Record<string, unknown> = {},
) {
  console.warn("[recovery]", { requestId, stage, ...extra });
}

function nakamaHttpKey(): string | null {
  try {
    return getNakamaHttpKey();
  } catch {
    throw new AppError("PASSWORD_RECOVERY_UNAVAILABLE");
  }
}

async function callRecoveryRpc(
  requestId: string,
  id: string,
  payload: object,
  client: NakamaGateway,
): Promise<Record<string, unknown>> {
  const httpKey = nakamaHttpKey();
  recoveryLog(requestId, "nakama_rpc_start", {
    rpc: id,
    transport: httpKey ? "http_key" : "session",
  });

  try {
    const result = await withNakamaErrors(async () => {
      if (httpKey) {
        return client.rpcHttpKey(httpKey, id, payload);
      }

      const session = await getLookupSession(client);
      return client.rpc(session, id, payload);
    });

    recoveryLog(requestId, "nakama_rpc_ok", { rpc: id });
    return readPayload(result?.payload);
  } catch (error) {
    recoveryLog(requestId, "nakama_rpc_failed", {
      rpc: id,
      code: error instanceof AppError ? error.code : "UNEXPECTED",
    });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("SERVER_UNAVAILABLE");
  }
}

export async function requestRecoveryTokenRpc(
  email: string,
  tokenHash: string,
  exp: number,
  requestId: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<boolean> {
  const payload = await callRecoveryRpc(
    requestId,
    RECOVERY_REQUEST_RPC,
    {
      email,
      tokenHash,
      exp,
      signature: signRecoveryMessage(
        `${RECOVERY_REQUEST_RPC}:${email}:${tokenHash}:${exp}`,
      ),
    },
    client,
  );

  return payload.created === true;
}

export async function confirmRecoveryTokenRpc(
  tokenHash: string,
  password: string,
  requestId: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<boolean> {
  const payload = await callRecoveryRpc(
    requestId,
    RECOVERY_CONFIRM_RPC,
    {
      tokenHash,
      password,
      signature: signRecoveryMessage(`${RECOVERY_CONFIRM_RPC}:${tokenHash}`),
    },
    client,
  );

  return payload.ok === true;
}
