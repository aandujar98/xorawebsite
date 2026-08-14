import { describe, expect, it } from "vitest";
import { sniffImageMime } from "@/lib/validation/avatar";
import { validateAvatarUrl } from "@/lib/validation/auth";

describe("avatar uploads", () => {
  it("accepts JPEG, PNG, GIF, and WebP magic bytes", () => {
    expect(sniffImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(sniffImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "image/png",
    );
    expect(sniffImageMime(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
    expect(
      sniffImageMime(
        Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe("image/webp");
  });

  it("accepts GIF files that only start with the GIF signature", () => {
    expect(sniffImageMime(Uint8Array.from([0x47, 0x49, 0x46, 0x00]))).toBe("image/gif");
    expect(sniffImageMime(Uint8Array.from([0x00, 0x01]), "image/gif")).toBe("image/gif");
  });

  it("rejects non-image bytes", () => {
    expect(sniffImageMime(Uint8Array.from([0x00, 0x01, 0x02]))).toBeNull();
  });

  it("allows hosted avatar paths on profile save", () => {
    expect(validateAvatarUrl("/api/avatars/player_one")).toBeNull();
    expect(validateAvatarUrl("https://cdn.xoranetwork.com/a.png")).toBeNull();
    expect(validateAvatarUrl("http://insecure.example/a.png")).toBe("INVALID_AVATAR_URL");
  });
});
