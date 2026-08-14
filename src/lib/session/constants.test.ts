import { describe, expect, it } from "vitest";
import {
  getProtectedRouteDecision,
  isProtectedPath,
  safeNextPath,
} from "@/lib/session/constants";

describe("protected dashboard route", () => {
  it("treats the dashboard as a protected path", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/profile")).toBe(true);
    expect(isProtectedPath("/security")).toBe(true);
    expect(isProtectedPath("/friends")).toBe(true);
    expect(isProtectedPath("/notifications")).toBe(true);
    expect(isProtectedPath("/messages")).toBe(true);
    expect(isProtectedPath("/messages/player_one")).toBe(true);
    expect(isProtectedPath("/u/player_one")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("redirects anonymous visitors to login", () => {
    expect(
      getProtectedRouteDecision({ pathname: "/dashboard", hasSession: false }),
    ).toBe("login");
  });

  it("allows an authenticated visitor into the dashboard", () => {
    expect(
      getProtectedRouteDecision({ pathname: "/dashboard", hasSession: true }),
    ).toBe("allow");
  });

  it("sends signed-in users away from login and register", () => {
    expect(
      getProtectedRouteDecision({ pathname: "/login", hasSession: true }),
    ).toBe("dashboard");
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/profile")).toBe("/profile");
  });
});
