import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiRequest } from "@/lib/api/browser";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("maps an aborted request to NETWORK_TIMEOUT", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      }),
    );

    const pending = apiRequest("/api/auth/forgot-password", { method: "POST" });
    const expectation = expect(pending).rejects.toMatchObject({
      code: "NETWORK_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(15_000);
    await expectation;
  });

  it("requires JSON on successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not-json", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    await expect(apiRequest("/api/auth/forgot-password")).rejects.toBeInstanceOf(
      ApiClientError,
    );
  });
});
