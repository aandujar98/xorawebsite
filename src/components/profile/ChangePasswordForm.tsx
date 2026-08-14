"use client";

import { useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { validatePasswordChangeInput } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "info">("error");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validated = validatePasswordChangeInput({
      currentPassword,
      password,
      confirmPassword,
    });
    if (!validated.values) {
      setFieldErrors(validated.errors);
      setTone("error");
      setMessage(
        FRIENDLY_ERROR_MESSAGES[(validated.code as AppErrorCode) ?? "WEAK_PASSWORD"],
      );
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      await apiRequest("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setTone("info");
      setMessage("Your password has been updated.");
    } catch (error) {
      setTone("error");
      if (error instanceof ApiClientError) {
        setFieldErrors(error.fields ?? {});
        setMessage(error.message);
      } else {
        setMessage(FRIENDLY_ERROR_MESSAGES.UNEXPECTED);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <Field
        id="currentPassword"
        label="Current password"
        error={fieldErrors.currentPassword}
      >
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </Field>
      <Field id="newPassword" label="New password" error={fieldErrors.password}>
        <input
          id="newPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      <Field
        id="confirmNewPassword"
        label="Confirm new password"
        error={fieldErrors.confirmPassword}
      >
        <input
          id="confirmNewPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </Field>
      <AuthMessage message={message} tone={tone} />
      <div className="button-row">
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Update password"}
        </button>
      </div>
    </form>
  );
}
