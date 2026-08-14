import type { Session } from "@heroiclabs/nakama-js";
import { getSiteUrl } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getCurrentAccount, getNakamaUserByUsername } from "@/lib/nakama/account";
import {
  getNakamaClient,
  type NakamaGateway,
} from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import {
  AVATAR_COLLECTION,
  AVATAR_KEY,
  MAX_AVATAR_BYTES,
  hostedAvatarPath,
  sniffImageMime,
} from "@/lib/validation/avatar";

export type StoredAvatar = {
  mime: string;
  bytes: Uint8Array;
};

export async function uploadCurrentAvatar(
  session: Session,
  file: File,
  client: NakamaGateway = getNakamaClient(),
) {
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    throw new AppError("AVATAR_TOO_LARGE");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes, file.type);
  if (!mime) {
    throw new AppError("INVALID_AVATAR_IMAGE");
  }

  await withNakamaErrors(() =>
    client.writeStorageObjects(session, [
      {
        collection: AVATAR_COLLECTION,
        key: AVATAR_KEY,
        value: {
          mime,
          data: Buffer.from(bytes).toString("base64"),
        },
        permission_read: 2,
        permission_write: 1,
      },
    ]),
  );

  const account = await getCurrentAccount(session, client);
  const avatarUrl = `${getSiteUrl()}${hostedAvatarPath(account.username)}?v=${Date.now()}`;
  await withNakamaErrors(() =>
    client.updateAccount(session, { avatar_url: avatarUrl }),
  );

  return getCurrentAccount(session, client);
}

export async function readAvatarByUsername(
  session: Session,
  username: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<StoredAvatar> {
  const user = await getNakamaUserByUsername(session, username, client);
  const stored = await withNakamaErrors(() =>
    client.readStorageObjects(session, {
      object_ids: [
        {
          collection: AVATAR_COLLECTION,
          key: AVATAR_KEY,
          user_id: user.id,
        },
      ],
    }),
  );

  const value = stored.objects?.[0]?.value;
  if (!value || typeof value !== "object") {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  const record = value as { mime?: unknown; data?: unknown };
  if (typeof record.mime !== "string" || typeof record.data !== "string") {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  return {
    mime: record.mime,
    bytes: Buffer.from(record.data, "base64"),
  };
}
