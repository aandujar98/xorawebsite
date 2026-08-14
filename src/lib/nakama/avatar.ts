import type { Session } from "@heroiclabs/nakama-js";
import { getSiteUrl } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  deleteAvatarFile,
  readAvatarFile,
  writeAvatarFile,
} from "@/lib/avatars/store";
import { getCurrentAccount, getNakamaUserByUsername } from "@/lib/nakama/account";
import {
  getNakamaClient,
  type NakamaGateway,
} from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import {
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

  const userId = session.user_id?.trim();
  if (!userId) {
    throw new AppError("SESSION_EXPIRED");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes, file.type);
  if (!mime) {
    throw new AppError("INVALID_AVATAR_IMAGE");
  }

  await writeAvatarFile(userId, mime, bytes);

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
  if (!user.id) {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  return readAvatarFile(user.id);
}

export async function deleteCurrentAvatar(session: Session): Promise<void> {
  const userId = session.user_id?.trim();
  if (!userId) {
    return;
  }

  await deleteAvatarFile(userId);
}
