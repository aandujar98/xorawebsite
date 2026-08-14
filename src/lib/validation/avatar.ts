export const MAX_AVATAR_BYTES = 1024 * 1024;
export const AVATAR_COLLECTION = "xora_avatars";
export const AVATAR_KEY = "profile";

const DECLARED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
};

export function sniffImageMime(bytes: Uint8Array, declaredType = ""): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  const declared = DECLARED_IMAGE_TYPES[declaredType.toLowerCase().split(";")[0]?.trim() ?? ""];
  return declared ?? null;
}

export function hostedAvatarPath(username: string): string {
  return `/api/avatars/${encodeURIComponent(username)}`;
}

export function isHostedAvatarUrl(url: string, username: string): boolean {
  return (
    url.includes(`/api/avatars/${encodeURIComponent(username)}`) ||
    url.includes(`/api/avatars/${username}`)
  );
}
