import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteAvatarFile,
  readAvatarFile,
  writeAvatarFile,
} from "@/lib/avatars/store";

const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);

describe("avatar disk store", () => {
  const previous = process.env.AVATAR_DATA_DIR;

  beforeEach(async () => {
    process.env.AVATAR_DATA_DIR = await mkdtemp(path.join(tmpdir(), "xora-avatars-"));
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.AVATAR_DATA_DIR;
    } else {
      process.env.AVATAR_DATA_DIR = previous;
    }
  });

  it("stores a GIF without going through Nakama storage", async () => {
    await writeAvatarFile("user-1", "image/gif", gif);
    const stored = await readAvatarFile("user-1");
    expect(stored.mime).toBe("image/gif");
    expect(Array.from(stored.bytes)).toEqual(Array.from(gif));
    const raw = await readFile(
      path.join(process.env.AVATAR_DATA_DIR ?? "", "user-1.gif"),
    );
    expect(raw.byteLength).toBe(gif.byteLength);
  });

  it("replaces a previous photo and deletes the file", async () => {
    await writeAvatarFile("user-1", "image/gif", gif);
    await writeAvatarFile(
      "user-1",
      "image/png",
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const stored = await readAvatarFile("user-1");
    expect(stored.mime).toBe("image/png");
    await deleteAvatarFile("user-1");
    await expect(readAvatarFile("user-1")).rejects.toMatchObject({
      code: "PROFILE_NOT_FOUND",
    });
  });
});
