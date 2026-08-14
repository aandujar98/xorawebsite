import { describe, expect, it } from "vitest";
import {
  validateLoginInput,
  validatePassword,
  validateRegisterInput,
  validateResetPasswordInput,
  validateUsername,
} from "@/lib/validation/auth";

const validRegister = {
  email: "player@xoranetwork.com",
  username: "player_one",
  displayName: "Player One",
  password: "Correct1",
  confirmPassword: "Correct1",
  acceptTerms: true,
};

describe("registration validation", () => {
  it("accepts a Nakama-compatible registration payload", () => {
    const result = validateRegisterInput(validRegister);
    expect(result.values).toEqual({
      email: "player@xoranetwork.com",
      username: "player_one",
      displayName: "Player One",
      password: "Correct1",
    });
  });

  it("rejects an invalid email", () => {
    const result = validateRegisterInput({ ...validRegister, email: "not-an-email" });
    expect(result.errors.email).toBe("INVALID_EMAIL");
  });

  it("rejects a username with spaces", () => {
    expect(validateUsername("player one")).toBe("INVALID_USERNAME");
    const result = validateRegisterInput({ ...validRegister, username: "ab" });
    expect(result.errors.username).toBe("INVALID_USERNAME");
  });

  it("rejects a weak password", () => {
    expect(validatePassword("short")).toBe("WEAK_PASSWORD");
    expect(validatePassword("longenough")).toBe("WEAK_PASSWORD");
  });

  it("rejects mismatched passwords", () => {
    const result = validateRegisterInput({
      ...validRegister,
      confirmPassword: "Different1",
    });
    expect(result.errors.confirmPassword).toBe("PASSWORD_MISMATCH");
  });

  it("requires terms acceptance", () => {
    const result = validateRegisterInput({ ...validRegister, acceptTerms: false });
    expect(result.errors.acceptTerms).toBe("TERMS_REQUIRED");
  });
});

describe("login validation", () => {
  it("normalizes email", () => {
    const result = validateLoginInput({
      email: "  Player@XoraNetwork.com ",
      password: "Correct1",
      rememberMe: true,
    });
    expect(result.values?.identifier).toBe("player@xoranetwork.com");
  });

  it("accepts a username identifier", () => {
    const result = validateLoginInput({
      identifier: "Player_One",
      password: "Correct1",
      rememberMe: true,
    });
    expect(result.values?.identifier).toBe("Player_One");
  });

  it("rejects an empty identifier", () => {
    const result = validateLoginInput({
      identifier: "  ",
      password: "Correct1",
      rememberMe: false,
    });
    expect(result.errors.identifier).toBe("INVALID_CREDENTIALS");
  });
});

describe("reset password validation", () => {
  it("rejects mismatched passwords", () => {
    const result = validateResetPasswordInput({
      token: "reset-token",
      password: "NewPass1",
      confirmPassword: "OtherPass1",
    });
    expect(result.errors.confirmPassword).toBe("PASSWORD_MISMATCH");
    expect(result.values).toBeUndefined();
  });

  it("rejects a missing token", () => {
    const result = validateResetPasswordInput({
      token: "  ",
      password: "NewPass1",
      confirmPassword: "NewPass1",
    });
    expect(result.errors.token).toBe("INVALID_RESET_TOKEN");
  });
});
