import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function avatarDataDir(): string {
  const configured = process.env.AVATAR_DATA_DIR?.trim();
  if (configured) {
    return configured;
  }

  return path.join(process.cwd(), "data", "avatars");
}

function safeUserId(userId: string): string {
  const trimmed = userId.trim();
  if (!trimmed || !/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new AppError("UNEXPECTED");
  }
  return trimmed;
}

function pathsFor(userId: string) {
  const id = safeUserId(userId);
  const dir = avatarDataDir();
  return {
    dir,
    meta: path.join(dir, `${id}.json`),
    files: Object.values(MIME_TO_EXT).map((ext) => path.join(dir, `${id}.${ext}`)),
  };
}

export async function writeAvatarFile(
  userId: string,
  mime: string,
  bytes: Uint8Array,
): Promise<void> {
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    throw new AppError("INVALID_AVATAR_IMAGE");
  }

  const target = pathsFor(userId);
  await mkdir(target.dir, { recursive: true });
  await Promise.all(
    target.files.map((file) => unlink(file).catch(() => undefined)),
  );
  await writeFile(path.join(target.dir, `${safeUserId(userId)}.${ext}`), bytes);
  await writeFile(target.meta, JSON.stringify({ mime }));
}

export async function readAvatarFile(
  userId: string,
): Promise<{ mime: string; bytes: Uint8Array }> {
  const target = pathsFor(userId);
  let metaRaw: string;
  try {
    metaRaw = await readFile(target.meta, "utf8");
  } catch {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  let mime = "";
  try {
    const parsed = JSON.parse(metaRaw) as { mime?: unknown };
    mime = typeof parsed.mime === "string" ? parsed.mime : "";
  } catch {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    throw new AppError("PROFILE_NOT_FOUND");
  }

  try {
    const bytes = await readFile(path.join(target.dir, `${safeUserId(userId)}.${ext}`));
    return { mime, bytes };
  } catch {
    throw new AppError("PROFILE_NOT_FOUND");
  }
}

export async function deleteAvatarFile(userId: string): Promise<void> {
  const target = pathsFor(userId);
  await Promise.all([
    unlink(target.meta).catch(() => undefined),
    ...target.files.map((file) => unlink(file).catch(() => undefined)),
  ]);
}
