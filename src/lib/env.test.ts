import { describe, expect, it } from "vitest";
import {
  assertNakamaClientEndpoint,
  getNakamaHttpKey,
  getRecoverySecret,
} from "@/lib/env";

describe("recovery environment", () => {
  it("loads a recovery secret that is not the public server key", () => {
    expect(getRecoverySecret()).toBe("test-recovery-secret");
    expect(getRecoverySecret()).not.toBe(process.env.NAKAMA_SERVER_KEY);
  });

  it("loads a non-default Nakama HTTP key", () => {
    expect(getNakamaHttpKey()).toBe("test-http-key");
  });

  it("requires TLS port 443 for api.xoranetwork.com", () => {
    expect(() =>
      assertNakamaClientEndpoint({
        host: "api.xoranetwork.com",
        port: "443",
        ssl: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertNakamaClientEndpoint({
        host: "api.xoranetwork.com",
        port: "7350",
        ssl: false,
      }),
    ).toThrow(/443/);
  });
});
