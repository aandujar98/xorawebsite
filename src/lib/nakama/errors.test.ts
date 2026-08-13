import { describe, expect, it } from "vitest";
import { mapNakamaError } from "@/lib/nakama/errors";

describe("Nakama error mapping", () => {
  it("maps a network failure to a server-unavailable error", async () => {
    await expect(mapNakamaError(new TypeError("fetch failed"))).rejects.toMatchObject({
      code: "SERVER_UNAVAILABLE",
    });
  });

  it("maps a timeout string to a timeout error", async () => {
    await expect(mapNakamaError("Request timed out.")).rejects.toMatchObject({
      code: "NETWORK_TIMEOUT",
    });
  });

  it("maps a taken username without exposing the raw server body", async () => {
    const error = new Response(
      JSON.stringify({ message: "Username is already in use." }),
      { status: 409 },
    );

    await expect(mapNakamaError(error)).rejects.toMatchObject({
      code: "USERNAME_TAKEN",
      message: "That username is already taken.",
    });
  });

  it("maps an invalid Nakama server key without treating it as bad user credentials", async () => {
    const error = new Response(
      JSON.stringify({ code: 16, message: "Server key invalid" }),
      { status: 401 },
    );

    await expect(mapNakamaError(error)).rejects.toMatchObject({
      code: "NAKAMA_SERVER_KEY_INVALID",
    });
  });
});
