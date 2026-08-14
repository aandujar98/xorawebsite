"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { validateResetPasswordInput } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

function ResetPasswordFields() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(
    token ? null : FRIENDLY_ERROR_MESSAGES.INVALID_RESET_TOKEN,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validated = validateResetPasswordInput({
      token,
      password,
      confirmPassword,
    });
    if (!validated.values) {
      setFieldErrors(validated.errors);
      setMessage(
        FRIENDLY_ERROR_MESSAGES[(validated.code as AppErrorCode) ?? "INVALID_RESET_TOKEN"],
      );
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      router.replace("/login");
    } catch (error) {
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
      <AuthMessage message={message} />
      <Field id="password" label="New password" error={fieldErrors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      <Field
        id="confirmPassword"
        label="Confirm password"
        error={fieldErrors.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </Field>
      <button className="button button-primary" type="submit" disabled={pending || !token}>
        {pending ? "Saving..." : "Update password"}
      </button>
      <p className="form-footer">
        <Link href="/login">Back to sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<p>Loading reset form...</p>}>
      <ResetPasswordFields />
    </Suspense>
  );
}
